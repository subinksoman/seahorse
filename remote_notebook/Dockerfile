# Copyright 2015 deepsense.ai (CodiLime, Inc)
#
# Seahorse notebook image. Rebuilt on the current Jupyter docker-stacks base:
# JupyterLab 4 / Notebook 7 / jupyter-server 2 on Python 3.12 (was jupyter/minimal-notebook
# :python-3.7 with the classic notebook). The docker-stacks images now live on quay.io.
FROM quay.io/jupyter/minimal-notebook:python-3.12

USER root

# The base image already ships pip for the /opt/conda Python 3.12; no get-pip bootstrap needed.
# Install the Seahorse extras on top of the base Jupyter stack.
COPY requirements.txt /tmp/requirements.txt
RUN pip3 install --no-cache-dir -r /tmp/requirements.txt

# T92 security: patch OS + Python packages flagged by Trivy.
RUN apt-get update && apt-get -y upgrade && rm -rf /var/lib/apt/lists/*
RUN pip3 install --no-cache-dir -U \
      "jupyter_server>=2.20.0" "jupyterlab>=4.5.7" "notebook>=7.5.6" "nbconvert>=7.17.0" \
      "mistune>=3.2.1" "tornado>=6.5.3" "urllib3>=2.6.0" "cryptography>=46.0.5" "pyjwt>=2.12.0" \
      "Mako>=1.3.11" "Brotli>=1.2.0" "wheel>=0.46.2" "soupsieve>=2.8.4" "jaraco.context>=6.1.0" \
      "setuptools>=80"

# nbclassic (legacy classic-notebook shim) is an orphan here — Notebook 7 does not require it and
# Seahorse serves notebooks through jupyter-server + Notebook 7, not the classic /tree UI. It bundles
# an EOL MathJax 2.x (no fix) and an old underscore.js; removing it clears both CVEs.
RUN pip3 uninstall -y nbclassic 2>/dev/null || true

# jupyter_contrib_nbextensions is abandoned and incompatible with Notebook 7 / jupyter-server 2
# (it targeted the classic notebook). It is intentionally NOT installed anymore.

# Install and enable the Python 3 kernel
RUN python3 -m ipykernel install --name python3 --display-name "Python 3"

# Copy the custom forwarding kernel (RabbitMQ bridge) and its helper modules.
COPY code/forwarding_kernel/ /usr/local/share/jupyter/kernels/pyspark/
COPY code/rabbit_mq_client.py \
     code/socket_forwarder.py \
     code/utils.py \
     code/notebook_server_client.py \
     /usr/local/share/jupyter/kernels/pyspark/
COPY code/forwarding_kernel_py/ /usr/local/share/jupyter/kernels/forwarding_kernel_py/
COPY code/forwarding_kernel_r/ /usr/local/share/jupyter/kernels/forwarding_kernel_r/

# The notebook server and the forwarding kernels both run under the base image's
# /opt/conda Python 3.12, so the Seahorse packages are installed once into its site-packages.
# Jupyter Server 2's canonical config filename is jupyter_server_config.py (was the classic
# jupyter_notebook_config.py, which drove the removed NotebookApp).
COPY jupyter_server_config.py /home/jovyan/.jupyter/
COPY seahorse_notebook_path /opt/conda/lib/python3.12/site-packages/
COPY wmcontents /opt/conda/lib/python3.12/site-packages/wmcontents
COPY execute_saver /opt/conda/lib/python3.12/site-packages/execute_saver
COPY headless_notebook_handler.py /opt/conda/lib/python3.12/site-packages/headless_notebook_handler/

# Runtime overrides appended to the copied config. Jupyter Server 2 keys (NotebookApp.* are
# deprecated aliases of ServerApp.*; the auth token moved to IdentityProvider).
RUN echo "c.ServerApp.allow_root = True" >> /home/jovyan/.jupyter/jupyter_server_config.py \
 && echo "c.ServerApp.token = ''" >> /home/jovyan/.jupyter/jupyter_server_config.py \
 && echo "c.IdentityProvider.token = ''" >> /home/jovyan/.jupyter/jupyter_server_config.py \
 && echo "c.ServerApp.disable_check_xsrf = True" >> /home/jovyan/.jupyter/jupyter_server_config.py

COPY custom-start.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/custom-start.sh

EXPOSE 8888

ENV MQ_USER=guest
ENV MQ_PASS=guest
ENV HEARTBEAT_INTERVAL=2.0
ENV MISSED_HEARTBEAT_LIMIT=30

ENTRYPOINT ["tini", "--"]
CMD ["custom-start.sh"]
