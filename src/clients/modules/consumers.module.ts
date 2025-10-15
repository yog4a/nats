import type { Consumer, ConsumerInfo, ConsumerConfig, ConsumerUpdateConfig, PushConsumer } from 'src/libs/nats-jetstream.js';
import type { Logger } from 'src/classes/index.js';
import type { JetstreamClient } from "../client.jetstream.js";

// Class
// ===========================================================

export function consumersModule(this: JetstreamClient) {
    /* Logger */
    const logger: Logger = this.core.logger.child("[Consumers]");

    // Public

    /**
     * List all consumers for a stream
     * @param streamName - The name of the stream
     * @returns A list of consumer info
     */
    const list = async (streamName: string): Promise<ConsumerInfo[]> => {
        // Get the Jetstream manager (after client is ready)
        const jetstreamManager = await this.getJetstreamManager();
        const lister = jetstreamManager.consumers.list(streamName);

        // Get the list of consumers
        const consumers: ConsumerInfo[] = [];
        for await (const consumer of lister) {
            consumers.push(consumer);
        }

        return consumers;
    }

    /**
     * Get the info for a consumer
     * @param streamName - The name of the stream
     * @param consumerName - The name of the consumer
     * @returns The consumer info
     */
    const info = async (streamName: string, consumerName: string): Promise<ConsumerInfo> => {
        // Get the Jetstream manager (after client is ready)
        const jetstreamManager = await this.getJetstreamManager();

        // Retrieve the consumer info
        return await jetstreamManager.consumers.info(streamName, consumerName);
    }

    /**
     * Create a consumer
     * @param streamName - The name of the stream
     * @param consumerName - The name of the consumer
     * @param config - The consumer config
     * @returns The consumer info
     */
    const create = async (streamName: string, consumerName: string, config: Partial<ConsumerConfig>): Promise<ConsumerInfo> => {
        // Get the Jetstream manager (after client is ready)
        const jetstreamManager = await this.getJetstreamManager();

        // Create the consumer
        const fullConfig = { ...config, name: consumerName };
        const info = await jetstreamManager.consumers.add(streamName, fullConfig);

        if (this.debug) {
            logger.info(`Consumer "${config.durable_name}" created for stream "${streamName}"`);
        }

        return info;
    }

    /**
     * Update a consumer
     * @param streamName - The name of the stream
     * @param consumerName - The name of the consumer
     * @param config - The consumer config
     * @returns The consumer info
     */
    const update = async (streamName: string, consumerName: string, config: Partial<ConsumerUpdateConfig>): Promise<ConsumerInfo> => {
        // Get the Jetstream manager (after client is ready)
        const jetstreamManager = await this.getJetstreamManager();

        // Update the consumer
        const info = await jetstreamManager.consumers.update(streamName, consumerName, config);

        if (this.debug) {
            logger.info(`Consumer "${consumerName}" updated for stream "${streamName}"`);
        }

        return info;
    }

    /**
     * Delete a consumer
     * @param streamName - The name of the stream
     * @param consumerName - The name of the consumer
     * @returns True if the consumer was deleted, false otherwise
     */
    const destroy = async (streamName: string, consumerName: string): Promise<boolean> => {
        // Get the Jetstream manager (after client is ready)
        const jetstreamManager = await this.getJetstreamManager();

        // Delete the consumer
        const isDeleted = await jetstreamManager.consumers.delete(streamName, consumerName);

        if (this.debug) {
            logger.info(`Consumer "${consumerName}" deleted from stream "${streamName}"`);
        }

        return isDeleted;
    }

    /**
     * Get a pull consumer
     * @param streamName - The name of the stream
     * @param consumerName - The name of the consumer
     * @returns The pull consumer
     */
    const getPullConsumer = async (streamName: string, consumerName: string): Promise<Consumer> => {
        // Get the Jetstream manager (after client is ready)
        const jetstreamManager = await this.getJetstreamManager();

        // Retrieve the consumer.
        const info = await jetstreamManager.consumers.info(streamName, consumerName);

        if (!info.config.durable_name) {
            throw new Error("Consumer is ephemeral");
        }

        if (info.config.deliver_subject) {
            throw new Error("Consumer is push consumer");
        }

        // Get the Jetstream client (after client is ready)
        const jetstreamClient = await this.getJetstreamClient();
        const pullConsumer = await jetstreamClient.consumers.get(streamName, consumerName);

        return pullConsumer;
    }

    /**
     * Get a push consumer
     * @param streamName - The name of the stream
     * @param consumerName - The name of the consumer
     * @returns The push consumer
     */
    const getPushConsumer = async (streamName: string, consumerName: string): Promise<PushConsumer> => {
        // Get the Jetstream manager (after client is ready)
        const jetstreamManager = await this.getJetstreamManager();

        // Retrieve the consumer.
        const info = await jetstreamManager.consumers.info(streamName, consumerName);

        if (!info.config.durable_name) {
            throw new Error("Consumer is ephemeral");
        }

        if (!info.config.deliver_subject) {
            throw new Error("Consumer is pull consumer");
        }

        // Get the Jetstream client (after client is ready)
        const jetstreamClient = await this.getJetstreamClient();
        const pushConsumer = await jetstreamClient.consumers.getPushConsumer(streamName, consumerName);

        return pushConsumer;
    }

    // Export

    return {
        list,
        info,
        create,
        update,
        destroy,
        getPullConsumer,
        getPushConsumer,
    }
}