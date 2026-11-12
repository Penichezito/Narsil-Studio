package main

import (
	"context"
	"errors"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	narsilv1 "github.com/Narsil-Studio/services/gen/v1"
	transport "github.com/Narsil-Studio/services/internal/transport/grpc"
)

// Test APi Version 26/10/26
func main() {
	// --- gRPC server ---
	lis, err := net.Listen("tcp", ":9090")
	if err != nil {
		log.Fatalf("failed to listen :9090: %v", err)
	}

	grpcServer := grpc.NewServer()
	leadServer := transport.NewLeadServer()
	narsilv1.RegisterLeadServiceServer(grpcServer, leadServer)
	narsilv1.RegisterHealthServiceServer(grpcServer, leadServer)

	go func() {
		log.Println("gRPC listen in :9090")
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("gRPC failed: %v", err)
		}
	}()

	// --- REST gateway ---
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	mux := runtime.NewServeMux()
	opts := []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())}

	if err := narsilv1.RegisterLeadServiceHandlerFromEndpoint(ctx, mux, ":9090", opts); err != nil {
		log.Fatalf("Failed on gateway register (lead): %v", err)
	}

	if err := narsilv1.RegisterHealthServiceHandlerFromEndpoint(ctx, mux, ":9090", opts); err != nil {
		log.Fatalf("Failed on gateway register (health): %v", err)
	}

	httpServer := &http.Server{Addr: ":8080", Handler: mux}

	go func() {
		log.Println("HTTP listen in :8080")
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("failed on HTTP gateway listen: %v", err)
		}
	}()

	// --- Graceful shutdown ---
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	grpcServer.GracefulStop()
	err = httpServer.Shutdown(ctx)
	if err != nil {
		return
	}
}
