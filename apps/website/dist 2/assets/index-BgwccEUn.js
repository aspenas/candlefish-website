const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/HomePage-ePWmd-jY.js","assets/three-B-EYDSmC.js","assets/vendor-DGUZjIjy.js","assets/animations-CtHQOp4r.js","assets/NotFoundPage-BouVk_e_.js","assets/router-DT8i7phJ.js"])))=>i.map(i=>d[i]);
var L=Object.defineProperty;var R=(s,i,n)=>i in s?L(s,i,{enumerable:!0,configurable:!0,writable:!0,value:n}):s[i]=n;var y=(s,i,n)=>R(s,typeof i!="symbol"?i+"":i,n);import{j as t,_,c as A}from"./three-B-EYDSmC.js";import{r as d,b as u}from"./vendor-DGUZjIjy.js";import{B as N,R as P,a as v}from"./router-DT8i7phJ.js";(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))e(o);new MutationObserver(o=>{for(const a of o)if(a.type==="childList")for(const l of a.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&e(l)}).observe(document,{childList:!0,subtree:!0});function n(o){const a={};return o.integrity&&(a.integrity=o.integrity),o.referrerPolicy&&(a.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?a.credentials="include":o.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function e(o){if(o.ep)return;o.ep=!0;const a=n(o);fetch(o.href,a)}})();class C extends d.Component{constructor(){super(...arguments);y(this,"state",{hasError:!1})}static getDerivedStateFromError(n){return{hasError:!0,error:n}}componentDidCatch(n,e){console.error("ErrorBoundary caught an error:",n,e)}render(){return this.state.hasError?t.jsx("div",{className:"min-h-screen bg-black text-white flex items-center justify-center p-8",children:t.jsxs("div",{className:"text-center max-w-md",children:[t.jsx("h1",{className:"text-4xl font-light mb-4 text-teal-400",children:"Something went wrong"}),t.jsx("p",{className:"text-gray-400 mb-6",children:"We're sorry, but something unexpected happened. Please refresh the page or try again later."}),t.jsx("button",{onClick:()=>window.location.reload(),className:"inline-flex items-center px-6 py-3 bg-teal-400 text-black font-medium hover:bg-white transition-colors duration-200",children:"Refresh Page"})]})}):this.props.children}}const z=()=>t.jsx("div",{className:"fixed inset-0 bg-black z-50 flex items-center justify-center",children:t.jsxs("div",{className:"text-center",children:[t.jsxs("picture",{children:[t.jsx("source",{srcSet:"/logo/candlefish_original.png",type:"image/webp"}),t.jsx("img",{src:"/logo/candlefish_original.png",alt:"Candlefish AI Logo",className:"w-auto h-48 max-w-32 mb-6 mx-auto object-contain animate-pulse"})]}),t.jsx("div",{className:"text-sm text-gray-400 font-mono tracking-wider uppercase",children:"Illuminating possibilities..."})]})}),F=()=>{const s=d.useRef(null),i=d.useRef();return d.useEffect(()=>{const n=s.current;if(!n)return;const e=n.getContext("webgl")||n.getContext("experimental-webgl");if(!e||!(e instanceof WebGLRenderingContext)){console.warn("WebGL not supported, particles disabled");return}const o=()=>{n.width=window.innerWidth,n.height=window.innerHeight,e.viewport(0,0,n.width,n.height)};o(),window.addEventListener("resize",o);const a=`
      attribute vec2 a_position;
      attribute float a_size;
      attribute float a_opacity;

      varying float v_opacity;

      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        gl_PointSize = a_size;
        v_opacity = a_opacity;
      }
    `,l=`
      precision mediump float;

      varying float v_opacity;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float distance = length(coord);

        if (distance > 0.5) {
          discard;
        }

        float alpha = 1.0 - smoothstep(0.0, 0.5, distance);
        gl_FragColor = vec4(0.0, 0.808, 0.82, alpha * v_opacity * 0.3);
      }
    `,f=(r,S)=>{const m=e.createShader(r);return m?(e.shaderSource(m,S),e.compileShader(m),m):null},h=f(e.VERTEX_SHADER,a),p=f(e.FRAGMENT_SHADER,l);if(!h||!p)return;const c=e.createProgram();if(!c)return;e.attachShader(c,h),e.attachShader(c,p),e.linkProgram(c);const b=e.getAttribLocation(c,"a_position"),w=e.getAttribLocation(c,"a_size"),j=e.getAttribLocation(c,"a_opacity"),E=30,x=[];for(let r=0;r<E;r++)x.push({x:Math.random()*2-1,y:Math.random()*2-1,vx:(Math.random()-.5)*5e-4,vy:(Math.random()-.5)*5e-4,size:Math.random()*8+4,opacity:Math.random()*.3+.1});const g=()=>{!e||e.isContextLost()||(e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(c),x.forEach(r=>{r.x+=r.vx,r.y+=r.vy,r.x>1&&(r.x=-1),r.x<-1&&(r.x=1),r.y>1&&(r.y=-1),r.y<-1&&(r.y=1),e.vertexAttrib2f(b,r.x,r.y),e.vertexAttrib1f(w,r.size),e.vertexAttrib1f(j,r.opacity),e.drawArrays(e.POINTS,0,1)}),i.current=requestAnimationFrame(g))};return e.enable(e.BLEND),e.blendFunc(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA),g(),()=>{window.removeEventListener("resize",o),i.current&&cancelAnimationFrame(i.current)}},[]),t.jsx("canvas",{ref:s,className:"fixed top-0 left-0 w-full h-full -z-10 opacity-10 pointer-events-none",id:"particles-canvas"})},O=u.lazy(()=>_(()=>import("./HomePage-ePWmd-jY.js"),__vite__mapDeps([0,1,2,3]))),M=u.lazy(()=>_(()=>import("./NotFoundPage-BouVk_e_.js"),__vite__mapDeps([4,1,2,5])));function B(){return t.jsx(C,{children:t.jsx(N,{children:t.jsxs("div",{className:"relative min-h-screen overflow-x-hidden",style:{fontFamily:"var(--font-sans)",lineHeight:"1.6",color:"var(--text-primary)",backgroundColor:"var(--bg-primary)"},children:[t.jsx("div",{className:"grid-pattern"}),t.jsx(F,{}),t.jsx(d.Suspense,{fallback:t.jsx(z,{}),children:t.jsxs(P,{children:[t.jsx(v,{path:"/",element:t.jsx(O,{})}),t.jsx(v,{path:"*",element:t.jsx(M,{})})]})})]})})})}const I=performance.now();A.createRoot(document.getElementById("root")).render(t.jsx(u.StrictMode,{children:t.jsx(B,{})}));typeof window!="undefined"&&window.addEventListener("load",()=>{const s=performance.now()-I;console.log(`App loaded in ${s.toFixed(2)}ms`)});
//# sourceMappingURL=index-BgwccEUn.js.map
