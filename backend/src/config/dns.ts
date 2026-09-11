import dns from 'node:dns';

/**
 * Node's DNS resolver on some Windows setups refuses MongoDB SRV lookups
 * (querySrv ECONNREFUSED) even when nslookup succeeds. Prefer IPv4 and
 * public DNS so mongodb+srv:// can resolve Atlas hosts.
 */
dns.setDefaultResultOrder('ipv4first');

if (process.platform === 'win32') {
  const existing = dns.getServers().filter((server) => server !== '8.8.8.8' && server !== '1.1.1.1');
  dns.setServers(['8.8.8.8', '1.1.1.1', ...existing]);
}
