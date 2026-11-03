/**
 * Multi-Node Blockchain Consensus & Dynamic Failover Simulation
 *
 * Implements a 3-Node Raft-style distributed blockchain cluster:
 * - Node A (Primary Block Producer / Leader)
 * - Node B (Secondary Validator / Failover Leader)
 * - Node C (Distributed Observer / Quorum Witness)
 *
 * Provides live node heartbeat monitoring, node kill/revival simulation,
 * and automatic leader election failover.
 */

import crypto from "crypto";

export interface BlockchainNode {
  id: string;
  name: string;
  role: "leader" | "follower" | "observer";
  status: "ONLINE" | "OFFLINE / FAILED";
  ip_endpoint: string;
  last_heartbeat: string;
  blocks_validated: number;
}

export interface NodeFailoverState {
  active_leader_id: string;
  quorum_size: number;
  online_nodes_count: number;
  consensus_healthy: boolean;
  term: number;
  nodes: BlockchainNode[];
  last_failover_event?: {
    failed_node_id: string;
    new_leader_id: string;
    timestamp: string;
    failover_latency_ms: number;
    reason: string;
  };
}

class DistributedBlockchainNetwork {
  private nodes: Map<string, BlockchainNode> = new Map();
  private activeLeaderId: string = "node-alpha-primary";
  private term: number = 1;
  private lastFailover?: NodeFailoverState["last_failover_event"];

  constructor() {
    this.resetToHealthy();
  }

  public resetToHealthy() {
    this.nodes.clear();
    this.nodes.set("node-alpha-primary", {
      id: "node-alpha-primary",
      name: "Node A (Primary Edge)",
      role: "leader",
      status: "ONLINE",
      ip_endpoint: "10.0.1.10:8787",
      last_heartbeat: new Date().toISOString(),
      blocks_validated: 124,
    });
    this.nodes.set("node-beta-validator", {
      id: "node-beta-validator",
      name: "Node B (Secondary Validator)",
      role: "follower",
      status: "ONLINE",
      ip_endpoint: "10.0.2.14:8787",
      last_heartbeat: new Date().toISOString(),
      blocks_validated: 124,
    });
    this.nodes.set("node-gamma-witness", {
      id: "node-gamma-witness",
      name: "Node C (Quorum Witness)",
      role: "observer",
      status: "ONLINE",
      ip_endpoint: "10.0.3.18:8787",
      last_heartbeat: new Date().toISOString(),
      blocks_validated: 124,
    });
    this.activeLeaderId = "node-alpha-primary";
    this.term = 1;
    this.lastFailover = undefined;
  }

  public getState(): NodeFailoverState {
    const nodeList = Array.from(this.nodes.values());
    const onlineCount = nodeList.filter((n) => n.status === "ONLINE").length;
    const quorum = Math.floor(nodeList.length / 2) + 1; // 2 out of 3 needed
    return {
      active_leader_id: this.activeLeaderId,
      quorum_size: quorum,
      online_nodes_count: onlineCount,
      consensus_healthy: onlineCount >= quorum,
      term: this.term,
      nodes: nodeList,
      last_failover_event: this.lastFailover,
    };
  }

  /**
   * Simulates sudden catastrophic node failure (e.g. Node A hardware crash).
   * Triggers automatic Raft leader election failover to Node B.
   */
  public simulateNodeFailure(nodeId: string): NodeFailoverState {
    const target = this.nodes.get(nodeId);
    if (!target) return this.getState();

    target.status = "OFFLINE / FAILED";
    target.role = "follower";

    // If the failed node was the current leader, trigger instant consensus election
    if (this.activeLeaderId === nodeId) {
      const startTime = Date.now();
      this.term += 1;

      // Find healthy follower with highest priority
      const candidate = Array.from(this.nodes.values()).find(
        (n) => n.id !== nodeId && n.status === "ONLINE"
      );

      if (candidate) {
        candidate.role = "leader";
        this.activeLeaderId = candidate.id;
        const latency = Math.max(12, Date.now() - startTime + Math.floor(Math.random() * 8));

        this.lastFailover = {
          failed_node_id: nodeId,
          new_leader_id: candidate.id,
          timestamp: new Date().toISOString(),
          failover_latency_ms: latency,
          reason: `Node heartbeat timeout (400ms). Raft election promoted ${candidate.name} as term #${this.term} block producer.`,
        };
      }
    }

    return this.getState();
  }

  /**
   * Recovers / reboots a failed node and syncs it with the network.
   */
  public recoverNode(nodeId: string): NodeFailoverState {
    const target = this.nodes.get(nodeId);
    if (!target) return this.getState();

    target.status = "ONLINE";
    target.role = target.id === this.activeLeaderId ? "leader" : "follower";
    target.last_heartbeat = new Date().toISOString();

    return this.getState();
  }

  /**
   * Returns the currently active leader for block signing.
   */
  public getActiveSigningNode(): string {
    const leader = this.nodes.get(this.activeLeaderId);
    if (leader && leader.status === "ONLINE") {
      return leader.id;
    }
    // Fallback to any online node
    const anyOnline = Array.from(this.nodes.values()).find((n) => n.status === "ONLINE");
    return anyOnline?.id || "node-fallback-emergency";
  }
}

export const blockchainNetwork = new DistributedBlockchainNetwork();

