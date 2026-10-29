import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libsql loads a native driver for file: URLs; Node should require it at
  // runtime instead of webpack trying to bundle it.
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
