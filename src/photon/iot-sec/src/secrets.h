// This file is intended for use with cloud flashing only.
// For flashing locally, these `define`s should be injected via gcc's -D flag.
// This can be accomplished using the `particle.particle-vscode-code` extension
//   and setting `"particle.compileDefines": [ "SERVER_ROUTEHEADER=POST /v1/alert HTTP/1.1", "SERVER_HOSTNAME=example.com", "SERVER_AUTHHEADER=Authorization: Basic PASSWORD" ]`

#ifndef SERVER_ROUTEHEADER
  #define SERVER_ROUTEHEADER 'POST /v1/alert HTTP/1.1'
#endif

#ifndef SERVER_HOSTNAME
  #define SERVER_HOSTNAME 'example.com'
#endif

#ifndef SERVER_AUTHHEADER
  #define SERVER_AUTHHEADER 'Authorization: Basic password'
#endif
