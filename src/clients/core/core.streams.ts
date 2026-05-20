import type { StreamConfig, StreamInfo, StreamUpdateConfig } from "../../libs/nats-jetstream.js";
import type { WithRequired } from "../../libs/nats-transport.js";
import type { CoreClient } from "./core.client.js";

export function streamsModule(this: CoreClient) {

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
    };

    /**
     * Get the info for a stream
     * @param name - The name of the stream
     * @returns The stream info
     */
    const info = async (name: StreamConfig['name']): Promise<StreamInfo> => {
        const jsm = await this.getJetstreamManager();
        return jsm.streams.info(name);
    };

    const create = async (config: WithRequired<Partial<StreamConfig>, 'name'>): Promise<StreamInfo> => {
        const jsm = await this.getJetstreamManager();
        return jsm.streams.add(config);
    };

    const update = async (name: StreamConfig['name'], config: Partial<StreamUpdateConfig>): Promise<StreamInfo> => {
        const jsm = await this.getJetstreamManager();
        return jsm.streams.update(name, config);
    };

    const remove = async (name: StreamConfig['name']): Promise<boolean> => {
        const jsm = await this.getJetstreamManager();
        return jsm.streams.delete(name);
    };

    return { list, info, create, update, remove };
}