import config from '../src/config';
import { IDevice } from '../src/types/IDevice';
import { delayAsync } from '../src/utilities/delay';
import { arpscanDevicesAsync } from '../src/utilities/scanner';

async function scanForKnownDevicesAsync() {
    const detectedDevices = await arpscanDevicesAsync();
    const detectedMacs = new Set(detectedDevices.map(d => d.mac));

    return (config.knownPortableDevices || []).filter(kd => detectedMacs.has(kd.mac));
}

(async () => {
    let remainingPollCount = 3;
    const pollIntervalMilliseconds = 300;
    const pollPromises: Promise<IDevice[]>[] = [];
    while (remainingPollCount-- > 0) {
        const pollPromise = scanForKnownDevicesAsync();
        pollPromises.push(pollPromise);
        console.log(new Date());

        await delayAsync(pollIntervalMilliseconds);
    };

    const initialMacs = new Set<string>();
    for (const promise of pollPromises) {
        for (const mac of (await promise).map(d => d.mac)) {
            initialMacs.add(mac);
        }
    }

    console.log(initialMacs);

})();
