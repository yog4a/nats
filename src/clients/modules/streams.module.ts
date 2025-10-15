import type { StreamConfig, StreamInfo, StreamUpdateConfig } from "src/libs/nats-jetstream.js";
import type { WithRequired } from "src/libs/nats-transport.js";
import type { Logger } from 'src/classes/index.js';
import type { JetstreamClient } from "../client.jetstream.js";

// Class
// ===========================================================

export function streamsModule(this: JetstreamClient) {
    /* Logger */
    const logger: Logger = this.core.logger.child("[Streams]");

    // Public

    /**
     * List all streams
     * @returns A list of stream info
     */
    const list = async (): Promise<StreamInfo[]> => {
        // Get the Jetstream manager (after client is ready)
        const jetstreamManager = await this.getJetstreamManager();
        const lister = jetstreamManager.streams.list();

        // Retrieve current stream info.
        const streams: StreamInfo[] = [];
        for await (const stream of lister) {
            streams.push(stream);
        }

        return streams;
    }

    /**
     * Get the info for a stream
     * @param streamName - The name of the stream
     * @returns The stream info
     */
    const info = async (streamName: StreamConfig['name']): Promise<StreamInfo> => {
        // Get the Jetstream manager (after client is ready)
        const jetstreamManager = await this.getJetstreamManager();

        // Retrieve current stream info.
        return await jetstreamManager.streams.info(streamName);
    }

    /**
     * Create a stream
     * @param streamConfig - The stream config
     * @returns The stream info
     */
    const create = async (streamConfig: WithRequired<Partial<StreamConfig>, 'name'>): Promise<StreamInfo> => {
        // Get the Jetstream manager (after client is ready)
        const jetstreamManager = await this.getJetstreamManager();

        // Create the stream with the given configuration.
        const info = await jetstreamManager.streams.add(streamConfig);

        if (this.debug) {
            logger.info(`Stream "${streamConfig.name}" created!`);
        }   

        return info;
    }

    /**
     * Update a stream
     * @param streamName - The name of the stream
     * @param streamUpdateConfig - The stream update config
     * @returns The stream info
     */
    const update = async (streamName: StreamConfig['name'], streamUpdateConfig: Partial<StreamUpdateConfig>): Promise<StreamInfo> => {
        // Get the Jetstream manager (after client is ready)
        const jetstreamManager = await this.getJetstreamManager();

        // Update the stream with the merged configuration.
        const info = await jetstreamManager.streams.update(streamName, streamUpdateConfig);

        if (this.debug) {
            logger.info(`Stream "${streamName}" updated!`);
        }

        return info;
    }

    /**
     * Delete a stream
     * @param streamName - The name of the stream
     * @returns True if the stream was deleted, false otherwise
     */
    const destroy = async (streamName: StreamConfig['name']): Promise<boolean> => {
        // Get the Jetstream manager (after client is ready)
        const jetstreamManager = await this.getJetstreamManager();

        // Delete the stream
        const deleted = await jetstreamManager.streams.delete(streamName);

        if (this.debug) {
            logger.info(`Stream "${streamName}" deleted!`);
        }

        return deleted;
    }

    // Export

    return {
        list,
        info,
        create,
        update,
        destroy,
    }
}
