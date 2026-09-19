const SSO_URL = "https://sso.tku.edu.tw/NEAI/loginrwd.jsp";
const FRONTEND_URL = "https://stevedrfake.github.io/TKUTimeTable/";
const TKU_API = "https://ilifeapi.az.tku.edu.tw/api/ilifeStuClassApi";

function cors(origin) {
  const allow = origin === "https://stevedrfake.github.io" ? origin : "https://stevedrfake.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin"
  };
}
function json(request, body, status=200) {
  return new Response(JSON.stringify(body, null, 2), {status, headers:{...cors(request.headers.get("Origin")),"Content-Type":"application/json; charset=utf-8"}});
}
function safeReturn(raw) {
  try {
    const u = new URL(raw || FRONTEND_URL);
    if (u.origin === "https://stevedrfake.github.io") return u.toString();
  } catch {}
  return FRONTEND_URL;
}
function keysOnly(url) {
  return [...new Set([...url.searchParams.keys()])].filter(k=>k !== "return").slice(0,30);
}
function cookie(name,value,maxAge=900) {
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; Secure; HttpOnly; SameSite=Lax`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null,{status:204,headers:cors(request.headers.get("Origin"))});

    if (url.pathname === "/health") return json(request,{ok:true,service:"tku-timetable-worker",version:2});

    if (url.pathname === "/auth/start") {
      const returnUrl = safeReturn(url.searchParams.get("return"));
      const callback = `${url.origin}/auth/callback?return=${encodeURIComponent(returnUrl)}`;
      const login = new URL(SSO_URL);
      login.searchParams.set("myurl", callback);
      return new Response(null,{status:302,headers:{"Location":login.toString(),"Set-Cookie":cookie("tku_auth_test","1")}});
    }

    if (url.pathname === "/auth/callback") {
      const keys = keysOnly(url);
      const returnUrl = safeReturn(url.searchParams.get("return"));
      const out = new URL(returnUrl);
      out.searchParams.set("tku_auth_test","1");
      out.searchParams.set("status",keys.length ? "callback_received" : "callback_no_parameters");
      out.searchParams.set("keys",keys.join(","));
      return new Response(null,{status:302,headers:{"Location":out.toString()}});
    }

    if (url.pathname === "/api/tku-probe") {
      try {
        const r = await fetch(TKU_API,{redirect:"manual",headers:{"Accept":"application/json, text/plain, */*"}});
        return json(request,{ok:true,tkuStatus:r.status,location:r.headers.get("location")||"",contentType:r.headers.get("content-type")||"",hasSetCookie:Boolean(r.headers.get("set-cookie"))});
      } catch(e) { return json(request,{ok:false,error:String(e?.message||e)},502); }
    }

    return json(request,{ok:false,error:"Not found"},404);
  }
};
