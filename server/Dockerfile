FROM golang:1.23.1 as builder

# Set working directory
WORKDIR /build

# Copy only go.mod and go.sum first to leverage Docker cache
COPY go.mod go.sum ./
RUN go mod download

# # Copy the server directory
COPY / ./

# Build the application
RUN go build -o dist/server src/main.go

# Final stage
FROM debian:bookworm-slim

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /build/dist/server /app/dist/server

# Install necessary runtime dependencies
RUN apt-get update && \
    apt-get install -y ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Expose the port your server listens on
EXPOSE 8000

# Start the server
CMD ["./dist/server"]