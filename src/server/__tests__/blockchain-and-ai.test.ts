import { describe, it, expect } from "vitest";
import { blockchainNetwork } from "../blockchain-network";
import { runIsolationForestAnomalyDetection, type DocumentFeatureVector } from "../isolation-forest";

describe("Blockchain Distributed Consensus & Raft Failover Test", () => {
  it("initializes with 3 online nodes and Node A as active leader", () => {
    blockchainNetwork.resetToHealthy();
    const state = blockchainNetwork.getState();
    expect(state.nodes.length).toBe(3);
    expect(state.online_nodes_count).toBe(3);
    expect(state.consensus_healthy).toBe(true);
    expect(state.active_leader_id).toBe("node-alpha-primary");
    expect(blockchainNetwork.getActiveSigningNode()).toBe("node-alpha-primary");
  });

  it("handles catastrophic failure of Node A and triggers automatic failover to Node B", () => {
    blockchainNetwork.resetToHealthy();
    const stateAfterFail = blockchainNetwork.simulateNodeFailure("node-alpha-primary");

    // Node A is offline
    const nodeA = stateAfterFail.nodes.find((n) => n.id === "node-alpha-primary");
    expect(nodeA?.status).toBe("OFFLINE / FAILED");

    // Node B is elected as new leader
    expect(stateAfterFail.active_leader_id).toBe("node-beta-validator");
    expect(blockchainNetwork.getActiveSigningNode()).toBe("node-beta-validator");

    // Quorum is preserved (2 out of 3 alive = healthy)
    expect(stateAfterFail.online_nodes_count).toBe(2);
    expect(stateAfterFail.consensus_healthy).toBe(true);
    expect(stateAfterFail.last_failover_event).toBeDefined();
    expect(stateAfterFail.last_failover_event?.new_leader_id).toBe("node-beta-validator");
  });

  it("recovers Node A and rejoins the synchronized cluster", () => {
    blockchainNetwork.simulateNodeFailure("node-alpha-primary");
    const stateRecovered = blockchainNetwork.recoverNode("node-alpha-primary");

    const nodeA = stateRecovered.nodes.find((n) => n.id === "node-alpha-primary");
    expect(nodeA?.status).toBe("ONLINE");
    expect(stateRecovered.online_nodes_count).toBe(3);
    expect(stateRecovered.consensus_healthy).toBe(true);
  });
});

describe("AI Document Verification — Isolation Forest Anomaly Detection Algorithm", () => {
  it("classifies genuine document feature vector as GENUINE with low anomaly score", () => {
    const authenticVector: DocumentFeatureVector = {
      gross_net_ratio: 0.85,
      deduction_ratio: 0.15,
      math_discrepancy: 0.0,
      temporal_delta_hours: 0.0,
      incremental_revisions: 0,
      generator_anomaly: 0,
    };

    const result = runIsolationForestAnomalyDetection(authenticVector);
    expect(result.algorithm_name).toBe("Isolation Forest Anomaly Detection (iForest)");
    expect(result.is_anomaly).toBe(false);
    expect(result.anomaly_score).toBeLessThan(0.50);
    expect(result.verdict).toBe("GENUINE");
    expect(result.anomalous_features.length).toBe(0);
  });

  it("detects fabricated payslip with mathematical contradiction as TAMPERED", () => {
    const alteredVector: DocumentFeatureVector = {
      gross_net_ratio: 0.40, // Gross doesn't match net
      deduction_ratio: 0.60,
      math_discrepancy: 0.25, // 25% discrepancy
      temporal_delta_hours: 72.0, // Modified 3 days after creation
      incremental_revisions: 3, // Multiple edits
      generator_anomaly: 1, // Synthetic template marker
    };

    const result = runIsolationForestAnomalyDetection(alteredVector);
    expect(result.is_anomaly).toBe(true);
    expect(result.anomaly_score).toBeGreaterThanOrEqual(0.75);
    expect(result.verdict).toBe("TAMPERED / ANOMALOUS");
    expect(result.anomalous_features.length).toBeGreaterThan(0);
  });
});

