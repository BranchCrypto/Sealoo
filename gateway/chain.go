package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

const (
	taskNone   = 0
	taskLocked = 1
)

type Chain struct {
	rpc        string
	workCredit common.Address
	client     *http.Client
}

func newChain(rpc, workCredit string) *Chain {
	return &Chain{
		rpc:        rpc,
		workCredit: common.HexToAddress(workCredit),
		client:     &http.Client{Timeout: 20 * time.Second},
	}
}

type LockedTask struct {
	Owner    common.Address
	TaskID   common.Hash
	Estimate *big.Int
}

func (c *Chain) requireLocked(owner common.Address, taskID common.Hash) (LockedTask, error) {
	open, err := c.openTask(owner)
	if err != nil {
		return LockedTask{}, err
	}
	if open == (common.Hash{}) {
		return LockedTask{}, fmt.Errorf("no locked task")
	}
	if open != taskID {
		return LockedTask{}, fmt.Errorf("open task mismatch")
	}
	t, err := c.task(taskID)
	if err != nil {
		return LockedTask{}, err
	}
	if t.state != taskLocked {
		return LockedTask{}, fmt.Errorf("task not locked")
	}
	if !bytes.Equal(t.owner.Bytes(), owner.Bytes()) {
		return LockedTask{}, fmt.Errorf("task owner mismatch")
	}
	return LockedTask{Owner: t.owner, TaskID: taskID, Estimate: t.estimate}, nil
}

type onchainTask struct {
	owner    common.Address
	estimate *big.Int
	state    uint8
}

func (c *Chain) openTask(owner common.Address) (common.Hash, error) {
	data := selector("openTask(address)")
	data = append(data, common.LeftPadBytes(owner.Bytes(), 32)...)
	raw, err := c.call(data)
	if err != nil {
		return common.Hash{}, err
	}
	if len(raw) < 32 {
		return common.Hash{}, fmt.Errorf("openTask: short result")
	}
	return common.BytesToHash(raw[:32]), nil
}

func (c *Chain) task(id common.Hash) (onchainTask, error) {
	data := selector("tasks(bytes32)")
	data = append(data, id.Bytes()...)
	raw, err := c.call(data)
	if err != nil {
		return onchainTask{}, err
	}
	if len(raw) < 96 {
		return onchainTask{}, fmt.Errorf("tasks: short result")
	}
	st := new(big.Int).SetBytes(raw[64:96]).Uint64()
	return onchainTask{
		owner:    common.BytesToAddress(raw[12:32]),
		estimate: new(big.Int).SetBytes(raw[32:64]),
		state:    uint8(st),
	}, nil
}

func selector(sig string) []byte {
	return crypto.Keccak256([]byte(sig))[:4]
}

type rpcRequest struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Method  string `json:"method"`
	Params  []any  `json:"params"`
}

type rpcResponse struct {
	Result string `json:"result"`
	Error  *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func (c *Chain) call(data []byte) ([]byte, error) {
	body, err := json.Marshal(rpcRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "eth_call",
		Params: []any{
			map[string]string{
				"to":   c.workCredit.Hex(),
				"data": "0x" + common.Bytes2Hex(data),
			},
			"latest",
		},
	})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest(http.MethodPost, c.rpc, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("rpc %s: %s", res.Status, truncate(string(raw), 240))
	}
	var out rpcResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	if out.Error != nil {
		return nil, fmt.Errorf("rpc: %s", out.Error.Message)
	}
	hex := strings.TrimPrefix(out.Result, "0x")
	if hex == "" {
		return []byte{}, nil
	}
	return common.FromHex(out.Result), nil
}
