#define outFragment _f
out vec4 outFragment; // Fragment Color

#define uv _u
in vec2 uv;

#define ro _ro
in vec3 ro;

#define rd _rd
in vec3 rd;

#define MAX_STEPS 90
#define MAX_DIST  350.0
#define SURF_DIST 0.01

#define viewMatrix _mv
uniform mat4 viewMatrix;

#define projectionMatrix _mp
uniform mat4 projectionMatrix;

uniform vec4 _d;
#define time _d.x
#define floorPos _d.y
#define gameArea _d.zw

uniform vec3 _ld;
#define lightDirection _ld
uniform vec3 _lc;
#define lightColor _lc
uniform vec3 _la;
#define lightAmbientColor _la
uniform vec3 _lb;
#define lightBounceColor _lb


#define terrainSampler _t
uniform highp sampler3D terrainSampler;

#define whiteNoiseSampler _w
uniform highp sampler3D whiteNoiseSampler;


float sdBox(vec2 p, vec2 b)
{
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}

float riverMap(vec2 uv){
/*     vec2 id = floor(uv);

    uv.y+=fbm(vec3(uv.x*2.0,id.y,0))-0.5;
    float l = smoothstep(0.1,0.0,abs(fract(uv).y-0.5)-0.008);
    return l; */
    return 0.0;
}


float mapTree(vec3 p,vec2 id) {
  vec2 r =  texture(whiteNoiseSampler,fract(id*1242.345).xyy).xy;
  float treeSize =mix(0.2,0.6,r.x);
  return length(p)-treeSize;
}


vec2 map(vec3 p, out vec2 uv) {
    p.y += floorPos;
    uv = p.xy;

    vec3 terrainUv =  vec3(fract(uv*0.01),0);
    vec4 terrainS = texture(terrainSampler,terrainUv);

 
    float h = 0.5+terrainS.w*100.0;


    vec2 terrain = vec2(p.z + h, 0);

    // Trees
/*     if(terrainS.z>0.5)
     {
        float scale = 4.0;
        vec3 lp = (p+vec3(0,0,h))*scale;
        vec2 treeCoord = lp.xy;
        vec2 treePos = fract(treeCoord)-0.5;
        vec2 treeId = floor(treeCoord);

        float tree = mapTree(vec3(treePos,lp.z),treeId)/scale;
        if(tree<terrain.x){
            return vec2(tree,1);
        }
    } 
 */

    
    
/*     float h = fbm(vec3(p.xy*0.8,0))*0.6;
    h -= smoothstep(0.5,0.6,fbm(vec3((p.xy+vec2(43,54))*0.08,0)));
    h+=riverMap(p.xy*0.04);

float riverBed = p.z+1.9 + fbm(vec3(p.xy*0.8,0.0))*0.2;
    if(h>riverBed){
        return vec2(riverBed,1.0);
    } */
    return terrain;
}

float rayMarch(vec3 ro, vec3 rd, out float matId, out vec2 uv)
{
	float dO = 0.0;

	for (int i = 0; i < MAX_STEPS; ++i) {
		vec3 p = ro + rd * dO;
		vec2 mapped = map(p, uv);
		if (dO > MAX_DIST || abs(mapped.x) < SURF_DIST) {
			matId = mapped.y;
			break;
		}
		dO += mapped.x;
	}

	return dO;
} 

vec3 calcNormal( in vec3 p ) 
{
    float h = 0.001; // replace by an appropriate value
    vec2 k = vec2(1,-1);
    vec2 uv;
    return normalize( k.xyy*map( p + k.xyy*h,uv ).x + 
                      k.yyx*map( p + k.yyx*h,uv ).x + 
                      k.yxy*map( p + k.yxy*h,uv ).x + 
                      k.xxx*map( p + k.xxx*h,uv ).x );
}

float softshadow( in vec3 ro, in vec3 rd, float mint, float maxt, float k )
{
    float res = 1.0;
    float t = mint;
        vec2 uv;
    for( int i=0; i<256 && t<maxt; i++ )
    {
        float h = map(ro + rd*t,uv).x;
        if( h<0.001 )
            return 0.0;
        res = min( res, k*h/t );
        t += h;
    }
    return res;
}

void main()
{
    float matId;
    vec2 uvt;
    float d = rayMarch(ro, rd, matId, uvt);
    
    vec3 night = vec3(0.1,0,0.1);
    if(d >= MAX_DIST){
        outFragment = vec4(night,1);
        gl_FragDepth =-1.0;
        return;
    } 

	vec3 pos = ro + d * rd;
    vec3 normal = calcNormal(pos);

/*     uv = fract(uv);
    float l = 0.2;
    l += smoothstep(0.03, 0.0, abs(uv.x-0.5))*0.3;			
    l += smoothstep(0.03, 0.0, abs(uv.y-0.5))*0.3;	 */

    //float l = 0.3*max(0.0,dot(normal,vec3(0,0,1)))+softshadow(pos,lDir,0.1,30.0,0.8)*0.7*max(0.0,dot(normal,lDir));

    float lightDot = dot(normal, lightDirection);

    vec3 l = max(0.0, lightDot) * lightColor * softshadow(pos,lightDirection,0.1,30.0,0.8);
    l += max(0.0, -lightDot) *lightBounceColor;
    l += lightAmbientColor;


    //l=pow(l,-pos.z);
    vec3 mat = matId == 0.0 ? vec3(0.5,0.25,0.1) : vec3(0.1,0.6,0.1);
    vec3 outCol = l * mat;// vec3(fbm(vec3(uv*0.4, 0.0)));


    outCol = mix(outCol, night, (d/MAX_DIST)*(d/MAX_DIST));

    // game area plane intersection
    if(rd.z != 0.0) {
        vec3 pPos = ro + rd * ((0.0) - ro.z) / rd.z;
        vec2 pUv = pPos.xy;
        float a = smoothstep(0.0, 1.5, sdBox(pUv, gameArea)) * 0.75 * texture(terrainSampler,vec3(pUv / 10.0 + vec2(0,floorPos * 0.08), 0)).w;
        outCol = mix(outCol, vec3(0.6,0.6,0.65),a);
    }
    
    outFragment = vec4(outCol,1);
    vec4 projectedDepth = projectionMatrix * viewMatrix * vec4(pos, 1);
    gl_FragDepth =(projectedDepth.z/projectedDepth.w)*0.5+0.5;



 }