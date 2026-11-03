import { describe, expect, it, beforeEach } from "vitest";
import { blockchainNetwork } from "../blockchain-network";
import { sealLedgerBlock, verifyDistributedLedgerChain, type LedgerBlock } from "../document-authenticator";

describe("Distributed Blockchain Consensus & Fault-Tolerant Ledger", () => {
  beforeEach(() => {
    blockchainNetwork.resetToHealthy();
  });

  it("initializes with 3 active nodes and elected primary leader", () => {
    const state = blockchainNetwork.getState();
    expect(state.online_nodes_count).toBe(3);
    expect(state.quorum_size).toBe(2);
    expect(state.consensus_healthy).toBe(true);
    expect(state.active_leader_id).toBe("node-alpha-primary");
    expect(state.term).toBe(1);

    const leader = state.nodes.find((n) => n.id === state.active_leader_id);
    expect(leader?.role).toBe("leader");
    expect(leader?.status).toBe("ONLINE");
  });

  it("handles Raft leader election failover when Node A fails", () => {
    const failoverState = blockchainNetwork.simulateNodeFailure("node-alpha-primary");

    expect(failoverState.online_nodes_count).toBe(2);
    expect(failoverState.consensus_healthy).toBe(true); // 2/3 quorum preserved
    expect(failoverState.active_leader_id).toBe("node-beta-validator");
    expect(failoverState.term).toBe(2);

    expect(failoverState.last_failover_event).toBeDefined();
    expect(failoverState.last_failover_event?.failed_node_id).toBe("node-alpha-primary");
    expect(failoverState.last_failover_event?.new_leader_id).toBe("node-beta-validator");
    expect(failoverState.last_failover_event?.failover_latency_ms).toBeGreaterThanOrEqual(12);

    // Active signing node falls back to elected leader
    expect(blockchainNetwork.getActiveSigningNode()).toBe("node-beta-validator");
  });

  it("detects loss of quorum when majority of nodes fail", () => {
    blockchainNetwork.simulateNodeFailure("node-alpha-primary");
    const state2 = blockchainNetwork.simulateNodeFailure("node-beta-validator");

    expect(state2.online_nodes_count).toBe(1);
    expect(state2.quorum_size).toBe(2);
    expect(state2.consensus_healthy).toBe(false); // Quorum lost!
  });

  it("recovers failed nodes and restores cluster quorum", () => {
    blockchainNetwork.simulateNodeFailure("node-alpha-primary");
    expect(blockchainNetwork.getState().online_nodes_count).toBe(2);

    const recovered = blockchainNetwork.recoverNode("node-alpha-primary");
    expect(recovered.online_nodes_count).toBe(3);
    expect(recovered.consensus_healthy).toBe(true);

    const nodeA = recovered.nodes.find((n) => n.id === "node-alpha-primary");
    expect(nodeA?.status).toBe("ONLINE");
  });

  it("constructs and verifies an immutable 3-block cryptographic chain", () => {
    const block1 = sealLedgerBlock({
      blockIndex: 1,
      previousBlockHash: "0000000000000000000000000000000000000000000000000000000000000000",
      documentUuid: "doc-genesis-001",
      documentHash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      authenticityScore: 98,
      verdict: "ORIGINAL",
      validatorNode: "node-alpha-primary",
    });

    const block2 = sealLedgerBlock({
      blockIndex: 2,
      previousBlockHash: block1.block_hash,
      documentUuid: "doc-lease-002",
      documentHash: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
      authenticityScore: 95,
      verdict: "ORIGINAL",
      validatorNode: "node-alpha-primary",
    });

    const block3 = sealLedgerBlock({
      blockIndex: 3,
      previousBlockHash: block2.block_hash,
      documentUuid: "doc-payslip-003",
      documentHash: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
      authenticityScore: 92,
      verdict: "ORIGINAL",
      validatorNode: "node-beta-validator",
    });

    const chain: LedgerBlock[] = [block1, block2, block3];
    const audit = verifyDistributedLedgerChain(chain);
    expect(audit.valid).toBe(true);
    expect(audit.brokenAt).toBeUndefined();
  });

  it("detects malicious block tampering anywhere in the chain", () => {
    const block1 = sealLedgerBlock({
      blockIndex: 1,
      previousBlockHash: "0000000000000000000000000000000000000000000000000000000000000000",
      documentUuid: "doc-001",
      documentHash: "1111111111111111111111111111111111111111111111111111111111111111",
      authenticityScore: 100,
      verdict: "ORIGINAL",
    });

    const block2 = sealLedgerBlock({
      blockIndex: 2,
      previousBlockHash: block1.block_hash,
      documentUuid: "doc-002",
      documentHash: "2222222222222222222222222222222222222222222222222222222222222222",
      authenticityScore: 100,
      verdict: "ORIGINAL",
    });

    // Hacker tampers with document hash in Block #2
    const tamperedBlock2: LedgerBlock = {
      ...block2,
      document_hash: "9999999999999999999999999999999999999999999999999999999999999999",
    };

    const audit = verifyDistributedLedgerChain([block1, tamperedBlock2]);
    expect(audit.valid).toBe(false);
    expect(audit.brokenAt).toBe(2);
    expect(audit.error).toContain("Content has been tampered with");
  });
});
