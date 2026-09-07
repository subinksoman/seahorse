def transform(df):
    pdf = df.toPandas()

    pdf = pdf.select_dtypes(exclude=["object"])

    X = pdf.drop(
        columns=[
            "msisdn",
            "date",
            "churn"
        ],
        errors="ignore"
    )

    y = pdf["churn"]

    return X, y
