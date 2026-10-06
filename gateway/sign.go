package main

import (
	"fmt"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

func challengeMessage(publicURL, workCredit string, chainID int, address common.Address, taskID common.Hash) string {
	return strings.Join([]string{
		"Sealoo LLM gateway",
		"URI: " + strings.TrimRight(publicURL, "/"),
		fmt.Sprintf("Chain ID: %d", chainID),
		"WorkCredit: " + common.HexToAddress(workCredit).Hex(),
		"Address: " + address.Hex(),
		"Task: " + taskID.Hex(),
	}, "\n")
}

func recoverPersonalSign(message, sigHex string) (common.Address, error) {
	sig, err := decodeHex(sigHex)
	if err != nil {
		return common.Address{}, err
	}
	if len(sig) != 65 {
		return common.Address{}, fmt.Errorf("signature must be 65 bytes")
	}
	if sig[64] >= 27 {
		sig[64] -= 27
	}
	hash := crypto.Keccak256Hash([]byte(fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(message), message)))
	pub, err := crypto.SigToPub(hash.Bytes(), sig)
	if err != nil {
		return common.Address{}, err
	}
	return crypto.PubkeyToAddress(*pub), nil
}

func decodeHex(s string) ([]byte, error) {
	s = strings.TrimSpace(s)
	if !strings.HasPrefix(s, "0x") && !strings.HasPrefix(s, "0X") {
		s = "0x" + s
	}
	b := common.FromHex(s)
	if len(b) == 0 {
		return nil, fmt.Errorf("empty hex")
	}
	return b, nil
}
