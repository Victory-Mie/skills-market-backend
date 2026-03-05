// Docker Container Manager for Trial System
// MVP: Simulated container management
// Production: Replace with actual Docker API calls

class DockerManager {
  constructor() {
    this.containers = new Map();
  }

  /**
   * Start a Docker container for a skill trial
   * @param {Object} params - Container parameters
   * @param {string} params.containerId - Unique container ID
   * @param {string} params.skillId - Skill ID
   * @param {string} params.userId - User ID
   * @param {number} params.port - Container port
   * @param {Object} params.resources - Resource limits
   * @returns {Promise<Object>} Container info
   */
  async startContainer({ containerId, skillId, userId, port, resources }) {
    console.log(`[Docker] Starting container: ${containerId}`);
    console.log(`[Docker] Skill: ${skillId}, User: ${userId}, Port: ${port}`);
    console.log(`[Docker] Resources: CPU=${resources.maxCpuPercent}%, Memory=${resources.maxMemoryMB}MB, Disk=${resources.maxDiskMB}MB`);

    // MVP: Simulate container start
    // In production, use Dockerode or Docker API:
    /*
    const Docker = require('dockerode');
    const docker = new Docker();

    const container = await docker.createContainer({
      name: containerId,
      Image: `skill-${skillId}:latest`,
      HostConfig: {
        PortBindings: {
          '8000/tcp': [{ HostPort: port.toString() }],
        },
        CpuQuota: resources.maxCpuPercent * 10000, // CPU limit in units of 10^-9 CPUs
        Memory: resources.maxMemoryMB * 1024 * 1024, // Memory limit in bytes
        DiskQuota: resources.maxDiskMB * 1024 * 1024, // Disk limit in bytes
        AutoRemove: false, // We'll remove manually for cleanup
      },
      ExposedPorts: {
        '8000/tcp': {},
      },
    });

    await container.start();
    */

    // MVP: Store simulated container info
    const containerInfo = {
      id: containerId,
      skillId,
      userId,
      port,
      status: 'running',
      startedAt: new Date(),
      resources,
      // Simulated URL for accessing the skill
      url: `http://localhost:${port}`,
    };

    this.containers.set(containerId, containerInfo);

    console.log(`[Docker] Container started: ${containerId}`);

    return containerInfo;
  }

  /**
   * Stop and remove a container
   * @param {string} containerId - Container ID
   * @returns {Promise<boolean>} Success status
   */
  async stopContainer(containerId) {
    console.log(`[Docker] Stopping container: ${containerId}`);

    // MVP: Remove from simulated storage
    const container = this.containers.get(containerId);
    if (!container) {
      console.log(`[Docker] Container not found: ${containerId}`);
      return false;
    }

    // In production:
    /*
    const Docker = require('dockerode');
    const docker = new Docker();
    const container = docker.getContainer(containerId);

    try {
      await container.stop({ t: 10 }); // 10 second grace period
      await container.remove();
      console.log(`[Docker] Container stopped and removed: ${containerId}`);
      return true;
    } catch (error) {
      console.error(`[Docker] Error stopping container: ${error.message}`);
      return false;
    }
    */

    this.containers.delete(containerId);
    console.log(`[Docker] Container stopped: ${containerId}`);
    return true;
  }

  /**
   * Get container status
   * @param {string} containerId - Container ID
   * @returns {Promise<Object|null>} Container info or null
   */
  async getContainerStatus(containerId) {
    console.log(`[Docker] Getting status for container: ${containerId}`);

    const container = this.containers.get(containerId);
    if (!container) {
      return null;
    }

    // In production, query Docker API for real status
    /*
    const Docker = require('dockerode');
    const docker = new Docker();
    const container = docker.getContainer(containerId);

    const info = await container.inspect();
    return {
      status: info.State.Status,
      startedAt: info.State.StartedAt,
      url: `http://localhost:${containerInfo.port}`,
    };
    */

    return container;
  }

  /**
   * Cleanup expired or stopped containers
   * @param {Array<Object>} trials - List of trials to check
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupContainers(trials) {
    console.log(`[Docker] Cleaning up containers for ${trials.length} trials`);

    const results = {
      cleaned: 0,
      failed: 0,
      errors: [],
    };

    for (const trial of trials) {
      try {
        // Check if trial is expired or stopped
        const isExpired = new Date(trial.endsAt) < new Date();
        const isStopped = trial.status !== 'RUNNING';

        if (isExpired || isStopped) {
          const success = await this.stopContainer(trial.containerId);
          if (success) {
            results.cleaned++;
          } else {
            results.failed++;
          }
        }
      } catch (error) {
        console.error(`[Docker] Error cleaning up trial ${trial.id}:`, error);
        results.errors.push({
          trialId: trial.id,
          error: error.message,
        });
        results.failed++;
      }
    }

    console.log(`[Docker] Cleanup complete: ${results.cleaned} cleaned, ${results.failed} failed`);

    return results;
  }

  /**
   * Get resource usage for a container
   * @param {string} containerId - Container ID
   * @returns {Promise<Object>} Resource usage
   */
  async getResourceUsage(containerId) {
    console.log(`[Docker] Getting resource usage for container: ${containerId}`);

    const container = this.containers.get(containerId);
    if (!container) {
      return null;
    }

    // MVP: Return simulated usage
    return {
      cpuPercent: Math.random() * container.resources.maxCpuPercent,
      memoryMB: Math.random() * container.resources.maxMemoryMB,
      diskMB: Math.random() * container.resources.maxDiskMB,
    };

    // In production, query Docker stats:
    /*
    const Docker = require('dockerode');
    const docker = new Docker();
    const container = docker.getContainer(containerId);

    const stats = await container.stats({ stream: false });

    return {
      cpuPercent: calculateCpuPercent(stats),
      memoryMB: calculateMemoryMB(stats),
      diskMB: calculateDiskMB(stats),
    };
    */
  }
}

// Singleton instance
const dockerManager = new DockerManager();

module.exports = dockerManager;
