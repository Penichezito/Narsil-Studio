package grpc

import (
	"context"

	narsilv1 "github.com/Narsil-Studio/services/gen/v1"
)

type LeadServer struct {
	narsilv1.UnimplementedLeadServiceServer
	narsilv1.UnimplementedHealthServiceServer
}

func NewLeadServer() *LeadServer {
	return &LeadServer{}
}

func (s *LeadServer) HealthService(ctx context.Context, req *narsilv1.HealthRequest) (*narsilv1.HealthResponse, error) {
	return &narsilv1.HealthResponse{Status: "ok"}, nil
}

func (s *LeadServer) CreateLead(ctx context.Context, req *narsilv1.CreateLeadRequest) (*narsilv1.CreateLeadResponse, error) {
	// Honeypot: If website filled, silently discard
	if req.Website != "" {
		return &narsilv1.CreateLeadResponse{Id: "ignored"}, nil
	}

	// TODO: called command handler (next step)
	return &narsilv1.CreateLeadResponse{Id: "temp-id"}, nil

}
