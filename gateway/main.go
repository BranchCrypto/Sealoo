package main

import (
	"fmt"
	"log"
	"net/http"
	"time"
)

func main() {
	cfg, err := loadConfig()
	if err != nil {
		log.Fatal(err)
	}
	s := newServer(cfg, newChain(cfg.RPC, cfg.WorkCredit), newUpstream(cfg.UpstreamURL, cfg.UpstreamKey, cfg.Model), newStore(time.Duration(cfg.TicketTTL)*time.Second))
	fmt.Printf("sealoo gateway %s → %s (WorkCredit %s)\n", cfg.Listen, cfg.UpstreamURL, cfg.WorkCredit)
	log.Fatal(http.ListenAndServe(cfg.Listen, s.handler()))
}
