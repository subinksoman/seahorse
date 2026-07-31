import json
import time
from threading import Thread, Lock

import pika
from pika.exceptions import ConnectionClosed, ChannelClosed, AMQPError, StreamLostError

from utils import Logging

class RabbitMQClient(Logging):
    def __init__(self, address, credentials, exchange, exchange_type='topic', heartbeat=60, connection_attempts=3, retry_delay=5):
        super(RabbitMQClient, self).__init__()
        self._address = address
        self._exchange = exchange
        self._credentials = credentials
        self._exchange_type = exchange_type
        self._heartbeat = heartbeat
        self._consumer_connection_attempts = connection_attempts
        self._publisher_connection_attempts = connection_attempts
        self._retry_delay = retry_delay
        self._channel_impl = None
        self._publisher_impl = None
        self._connection = None
        self._publisher=None
        self._consumer_thread = None
        # Subscriptions (topic, handler) are tracked so they can be REPLAYED after a reconnect:
        # if the broker closes the consumer channel (e.g. consumer_timeout, or a network blip) the
        # consumer thread reconnects and re-declares/re-binds/re-consumes them, so the kernel
        # recovers on its own and "restart kernel" works instead of hanging on a dead channel.
        self._subscriptions = []
        self._closed = False
        # pika's BlockingConnection is NOT thread-safe. The forwarding/executing kernels publish
        # from several SocketForwarder threads (shell/iopub/control/stdin) through one client, which
        # interleaves AMQP frames and makes RabbitMQ drop the connection ("unexpected_frame",
        # "frame_too_large"), causing constant reconnects. Serialize all publishes with this lock.
        self._publish_lock = Lock()

        try:
            self._connect_consumer()
            self._declare_exchange_consumer()
            self._connect_publisher()
            self._declare_exchange_publisher()
            self.logger.info(f"RabbitMQClient initialized with exchange: {self._exchange}")
        except Exception as e:
            self.logger.error(f"Failed to initialize RabbitMQClient: {e}")
            raise

    def _connect_consumer(self):
        for attempt in range(self._consumer_connection_attempts):
            try:
                self.logger.info(f"Consumer Attempting to connect to RabbitMQ (Attempt {attempt + 1}/{self._consumer_connection_attempts})")
                self._connection = pika.BlockingConnection(
                    pika.ConnectionParameters(
                        host=self._address[0],
                        port=self._address[1],
                        credentials=pika.PlainCredentials(self._credentials[0], self._credentials[1]) 
                    )
                )
              
                self._channel_impl = self._connection.channel()
                self.logger.info("Consumer Successfully connected to RabbitMQ")
                return
            except (ConnectionClosed, AMQPError) as e:
                self.logger.warning(f"Consumer Failed to connect: {e}")
                if attempt < self._consumer_connection_attempts - 1:
                    self.logger.info(f"Consumer Retrying in {self._retry_delay} seconds...")
                    time.sleep(self._retry_delay)
                else:
                    self.logger.error("Consumer Max connection attempts reached")
                    raise
    
    def _connect_publisher(self):
        for attempt in range(self._publisher_connection_attempts):
            try:
                self.logger.info(f"publisher Attempting to connect to RabbitMQ (Attempt {attempt + 1}/{self._publisher_connection_attempts})")
                self._publisher = pika.BlockingConnection(
                    pika.ConnectionParameters(
                        host=self._address[0],
                        port=self._address[1],
                        credentials=pika.PlainCredentials(self._credentials[0], self._credentials[1])
                    )
                )
                self._publisher_impl = self._publisher.channel()
                self.logger.info("publisher Successfully connected to RabbitMQ")
                return
            except (ConnectionClosed, AMQPError) as e:
                self.logger.warning(f"publisher Failed to connect: {e}")
                if attempt < self._publisher_connection_attempts - 1:
                    self.logger.info(f"publisher Retrying in {self._retry_delay} seconds...")
                    time.sleep(self._retry_delay)
                else:
                    self.logger.error("publisher Max connection attempts reached")
                    raise
    
    def _reconnect_consumer(self):
        self.logger.info("Attempting to reconnect...")
        if self._connection and not self._connection.is_closed:
            try:
                self._connection.close()
            except Exception as e:
                self.logger.warning(f"Error closing existing connection: {e}")
        self._connect_consumer()
        self._declare_exchange_consumer()
    
    def _reconnect_publisher(self):
        self.logger.info("Attempting to reconnect...")
        if self._publisher and not self._publisher.is_closed:
            try:
                self._publisher.close()
            except Exception as e:
                self.logger.warning(f"Error closing existing connection: {e}")
        self._connect_publisher()
        self._declare_exchange_publisher()

    def send(self, topic, message, max_retries=3):
        # Serialize concurrent publishes (see _publish_lock) so AMQP frames from different
        # SocketForwarder threads don't interleave and corrupt the publisher connection.
        with self._publish_lock:
            self._send_locked(topic, message, max_retries)

    def _send_locked(self, topic, message, max_retries=3):
        for attempt in range(max_retries):
            try:
                self.logger.debug(f"Attempt {attempt + 1}: Sending message to topic: {topic} message :{message}")
                #self._reconnect()
                if self._publisher_impl is None:
                    raise Exception("Channel is None after reconnect")
                status = self._publisher_impl.basic_publish(
                    exchange=self._exchange,
                    routing_key=topic,
                    body=message,
                    mandatory=True
                )
                self.logger.debug(f"Message : {message} sent successfully. Status: {status}")
                return
            except (ConnectionClosed, ChannelClosed, AMQPError, StreamLostError) as e:
                self.logger.warning(f"Message : {message} send Attempt {attempt + 1} failed: {str(e)}")
                if attempt < max_retries - 1:
                    self.logger.info("Attempting to reconnect...")
                    self._reconnect_publisher()
                else:
                    self.logger.error("Max retries reached. Failed to send message.")
                    raise

    def subscribe(self, topic, handler):
        try:
            queue_name = self._bind_and_consume(topic, handler)
            # Remember the subscription so it can be replayed if the channel is reconnected.
            self._subscriptions.append((topic, handler))

            if not self._consumer_thread or not self._consumer_thread.is_alive():
                self._reset_consumer_thread(start=True)

            self.logger.info(f"Subscribed to topic: {topic} with queue: {queue_name}")
        except (ConnectionClosed, ChannelClosed, AMQPError) as e:
            self.logger.error(f"Failed to subscribe to topic {topic}: {e}")
            self._reconnect_consumer()
            raise
        except Exception as e:
            self.logger.error(f"Unexpected error while subscribing to topic {topic}: {e}")
            raise

    def _bind_and_consume(self, topic, handler):
        """Declare an exclusive queue, bind it to `topic` and start consuming with `handler`."""
        queue_name = self._channel_impl.queue_declare(queue='', exclusive=True).method.queue
        self._channel_impl.queue_bind(exchange=self._exchange, queue=queue_name, routing_key=topic)
        self._channel_impl.basic_consume(queue=queue_name, on_message_callback=handler)
        return queue_name

    def _resubscribe_all(self):
        """After a reconnect the old exclusive queues are gone — re-establish every subscription."""
        for topic, handler in list(self._subscriptions):
            self._bind_and_consume(topic, handler)
        self.logger.info(f"Re-subscribed {len(self._subscriptions)} topic(s) after reconnect")

    def _consume_forever(self):
        """Resilient consume loop (runs in the consumer thread). If the broker closes the channel
        or connection — e.g. the consumer_timeout PRECONDITION_FAILED (406), or a network blip —
        reconnect, replay all subscriptions and resume, instead of letting the thread die (which
        left the kernel unreachable and un-restartable)."""
        while not self._closed:
            try:
                self._channel_impl.start_consuming()
                return  # clean stop (stop_consuming) -> exit
            except (ChannelClosed, ConnectionClosed, StreamLostError, AMQPError) as e:
                if self._closed:
                    return
                self.logger.warning(f"Consumer channel closed ({e}); reconnecting + resubscribing")
                try:
                    self._reconnect_consumer()
                    self._resubscribe_all()
                except Exception as reconnect_error:
                    self.logger.error(
                        f"Consumer reconnect failed: {reconnect_error}; retrying in {self._retry_delay}s")
                    time.sleep(self._retry_delay)
            except Exception as e:
                self.logger.error(f"Consumer thread stopped on unexpected error: {e}")
                return

    def consume(self, inactivity_timeout, handle_message, on_timeout):
        """
        Consume from the exchange, invoking handle_message(channel, (method, properties, body))
        for each delivered message and on_timeout() whenever no message arrives within
        inactivity_timeout seconds. Blocks forever (used by the HeartbeatHandler in a dedicated
        daemon thread). Reimplements the pika-0.x consume() the heartbeat handler was written
        against, using pika 1.x's generator-based channel.consume(inactivity_timeout=...), which
        yields (None, None, None) on timeout.
        """
        queue_name = self._channel_impl.queue_declare(queue='', exclusive=True).method.queue
        # Heartbeat exchange is a fanout; no routing key needed.
        self._channel_impl.queue_bind(exchange=self._exchange, queue=queue_name)
        for method, properties, body in self._channel_impl.consume(
                queue_name, inactivity_timeout=inactivity_timeout):
            if method is None:
                on_timeout()
            else:
                handle_message(self._channel_impl, (method, properties, body))

    def _declare_exchange_consumer(self):
        try:
            self._channel_impl.exchange_declare(exchange=self._exchange, exchange_type=self._exchange_type)
            self.logger.info(f"Exchange declared: {self._exchange} (type: {self._exchange_type})")
        except (ConnectionClosed, ChannelClosed, AMQPError) as e:
            self.logger.error(f"Failed to declare exchange: {e}")
            self._reconnect_consumer()
            raise
        except Exception as e:
            self.logger.error(f"Unexpected error while declaring exchange: {e}")
            raise
    def _declare_exchange_publisher(self):
        try:
            self._publisher_impl.exchange_declare(exchange=self._exchange, exchange_type=self._exchange_type)
            self.logger.info(f"Exchange declared: {self._exchange} (type: {self._exchange_type})")
        except (ConnectionClosed, ChannelClosed, AMQPError) as e:
            self.logger.error(f"Failed to declare exchange: {e}")
            self._reconnect_publisher()
            raise
        except Exception as e:
            self.logger.error(f"Unexpected error while declaring exchange: {e}")
            raise
    def _reset_consumer_thread(self, start):
        try:
            if self._consumer_thread and self._consumer_thread.is_alive():
                self.logger.info("Stopping existing consumer thread")
                self._channel_impl.stop_consuming()
                self._consumer_thread.join(timeout=5)

            self._consumer_thread = Thread(target=self._consume_forever)
            self._consumer_thread.daemon = True
            if start:
                self._consumer_thread.start()
                self.logger.info("Consumer thread started")
        except Exception as e:
            self.logger.error(f"Error in reset_consumer_thread: {e}")
            raise

    def close(self):
        # Signal the resilient consume loop to stop reconnecting.
        self._closed = True
        try:
            if self._channel_impl and self._channel_impl.is_open:
                self._channel_impl.close()
            if self._connection and self._connection.is_open:
                self._connection.close()
            self.logger.info("RabbitMQ connection closed")
        except Exception as e:
            self.logger.error(f"Error while closing RabbitMQ connection: {e}")

class RabbitMQJsonSender(Logging):
    def __init__(self, rabbit_mq_client, topic):
        super(RabbitMQJsonSender, self).__init__()
        self._rabbit_mq_client = rabbit_mq_client
        self._topic = topic
        self.logger.info(f"RabbitMQJsonSender initialized for topic: {self._topic}")

    def send(self, message):
        json_message = json.dumps(message)
        #self.logger.debug(f"JSON message to be sent to topic: {self._topic}: {json_message}")
        self._rabbit_mq_client.send(topic=self._topic, message=json_message)
        self.logger.debug(f"JSON message sent to topic: {self._topic}")
       
class RabbitMQJsonReceiver(Logging):
    def __init__(self, rabbit_mq_client):
        super(RabbitMQJsonReceiver, self).__init__()
        self._rabbit_mq_client = rabbit_mq_client
        self.logger.info("RabbitMQJsonReceiver initialized")

    def subscribe(self, topic, handler):
        try:
            self._rabbit_mq_client.subscribe(topic, self._wrapped_handler(handler))
            self.logger.info(f'Subscribed to topic {topic}')
        except Exception as e:
            self.logger.error(f'Unexpected error while subscribing to topic {topic}: {e}')
            raise

    def _wrapped_handler(self, actual_handler):
        def handle(ch, method, properties, body):
            try:
                message = json.loads(body)
                self.logger.debug(f"Received JSON message on topic: {method.routing_key}: {message}")
                return actual_handler(message)
            except ValueError as e:
                self.logger.error(f"Failed to decode JSON message: {body}. Error: {e}")
            except Exception as e:
                self.logger.error(f"Unexpected error in message handler: {e}")
        return handle