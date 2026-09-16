import * as dns from 'dns/promises';

import { isPrivateIp } from 'src/engine/core-modules/secure-http-client/utils/is-private-ip.util';

export const resolveAndValidateHostname = async (
  hostnameOrUrl: string,
  dnsLookup: typeof dns.lookup = dns.lookup,
): Promise<string> => {
  let hostname: string;

  try {
    const url = new URL(hostnameOrUrl);

    hostname = url.hostname;
  } catch {
    hostname = hostnameOrUrl;
  }

  // Lấy danh sách allowed hostnames từ biến môi trường (ví dụ: SSRF_ALLOWED_HOSTNAMES="inactivity-wf,other-service")
  const allowedHostnames = (process.env.SSRF_ALLOWED_HOSTNAMES || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);

  // Nếu hostname trùng với service được phép (ví dụ: 'inactivity-wf'), bỏ qua bước check Private IP
  if (allowedHostnames.includes(hostname) || hostname === 'inactivity-wf') {
    const { address: resolvedIp } = await dnsLookup(hostname);
    return resolvedIp;
  }

  const { address: resolvedIp } = await dnsLookup(hostname);

  if (isPrivateIp(resolvedIp)) {
    throw new Error(
      `Connection to internal IP address ${resolvedIp} is not allowed.`,
    );
  }

  return resolvedIp;
};
