const os = require('os');
const fs = require('fs');
const log = require('@vladmandic/pilogger');
const nmap = require('node-nmap');

async function scan(host) {
  return new Promise((resolve) => {
    let proc;
    if (os.userInfo().uid === 0) {
      proc = new nmap.OsAndPortScan(host, '-Pn');
    } else {
      proc = new nmap.NmapScan(host, '-Pn');
    }
    proc.scanTimeout = 20000;
    proc.on('complete', (data) => {
      const result = data[0];
      result.time = proc.scanTime;
      resolve(result);
    });
    proc.on('error', (error) => resolve(error));
    proc.startScan();
  });
}

async function main() {
  const node = JSON.parse(fs.readFileSync('./package.json'));
  log.info(node.name, 'version', node.version);
  log.info('User:', os.userInfo().username, 'Platform:', process.platform, 'Arch:', process.arch, 'Node:', process.version);

  nmap.nmapLocation = 'nmap';
  if (os.userInfo().uid === 0) log.state('Running as root with full capabilities');
  else log.state('Running as non-root with limited capabilities');

  const host = process.argv[2] || 'localhost';
  const data = await scan(host);
  if (data) {
    let ports = '';
    ports += data.openPorts ? data.openPorts.map((a) => a.port) : '';
    log.data('host:', data.hostname || host, 'ip:', data.ip, 'time:', data.time.toLocaleString(), 'mac:', data.mac, 'vendor:', data.vendor, 'os:', data.osNmap, 'ports:', ports);
    if (data.openPorts) {
      for (const port of data.openPorts) log.data('', port.protocol, port.port, port.service);
    }
    log.state('Done...');
  } else {
    log.warn(host, 'no results');
  }
  process.exit(0);
}

main();

/*
to run nmap as non-root with full capabilities:
  sudo setcap cap_net_raw,cap_net_admin,cap_net_bind_service+eip /usr/bin/nmap
  nmap --priviledged ...
*/
