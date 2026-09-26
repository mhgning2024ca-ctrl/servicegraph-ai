FROM postgres:17-alpine

RUN apk add --no-cache bash

WORKDIR /app
COPY database ./database
COPY infrastructure/runtime/prepare-database.sh ./infrastructure/runtime/prepare-database.sh
RUN chmod 0555 ./infrastructure/runtime/prepare-database.sh

ENTRYPOINT ["/app/infrastructure/runtime/prepare-database.sh"]
