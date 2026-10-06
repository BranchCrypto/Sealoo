package main

// TokensPerCredit matches agent/runtime and docs/prepaid-credit.
const TokensPerCredit = 1000

func creditFromTokens(tokens int) int {
	if tokens <= 0 {
		return 0
	}
	return (tokens + TokensPerCredit - 1) / TokensPerCredit
}
