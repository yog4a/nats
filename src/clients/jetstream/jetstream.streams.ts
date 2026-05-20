import type { StreamConfig, StreamInfo, StreamUpdateConfig } from "../../libs/nats-jetstream.js";
import type { WithRequired } from "../../libs/nats-transport.js";
import type { JetstreamClient } from "./jetstream.client.js";

// ===========================================================
// Functions
// ===========================================================

export function streamsModule(this: JetstreamClient) {

    /**
     * List all streams
     * @returns A list of stream info
     */
    const list = async (): Promise<StreamInfo[]> => {
        const streams: StreamInfo[] = [];
        const jsm = await this.getJetstreamManager();

        for await (const stream of jsm.streams.list()) {
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
        return await jetstreamManager.streams.add(streamConfig);
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
        return await jetstreamManager.streams.update(streamName, streamUpdateConfig);
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
        return await jetstreamManager.streams.delete(streamName);
    }

    // ==============================
    // Exports
    // ==============================

    return {
        list,
        info,
        create,
        update,
        destroy,
    }
}
