import arp from '@network-utils/arp-lookup';

console.log(JSON.stringify(await arp.getTable()));
