#define outFragment _f
out vec4 outFragment; // Fragment Color

#define center _ic
in vec3 center;

#define ro _ro
in vec3 ro;

#define rd _rd
in vec3 rd;

#define sdfSpriteData _sd
in vec4 sdfSpriteData;

#define sdfScale _ss 
in float sdfScale;

#define sdfSampler _t
uniform highp sampler3D sdfSampler;

#define sdfMaterialSampler _m
uniform highp sampler3D sdfMaterialSampler;

#define invViewRotation _vr
in mat3 invViewRotation;

uniform vec3 _ld;
#define lightDirection _ld
uniform vec3 _lc;
#define lightColor _lc
uniform vec3 _la;
#define lightAmbientColor _la
uniform vec3 _lb;
#define lightBounceColor _lb

#define viewMatrix _mv
uniform mat4 viewMatrix;

#define projectionMatrix _mp
uniform mat4 projectionMatrix;

#define MAX_STEPS 100
#define SURF_DIST 0.001

float maxDist;
vec3 spriteTextureLocation;

#define sdfSpritesAtlasSide 5.0

vec2 sampleBakedSdf(in vec3 p){
	vec3 uvw = ((p * 0.5 + 0.5) + spriteTextureLocation) / vec3(sdfSpritesAtlasSide,sdfSpritesAtlasSide,1.0);
	
    return vec2(texture(sdfSampler, uvw).x, texture(sdfMaterialSampler, uvw).x);
}
 
vec2 bakedSdf(in vec3 p) {
	float lp = length(p);

	float sphereDist = lp - 1.0;
 	if(lp > 1.0){
		vec2 samp = sampleBakedSdf(p / lp);
		return samp + vec2(sphereDist,    0);
	}  
	return sampleBakedSdf(p); 
}

vec2 map(vec3 p){
    vec2 m = bakedSdf((invViewRotation * (p - center)) / sdfScale );
    m.x *= sdfScale;
    return m;
}

float rayMarch(vec3 ro, vec3 rd, out float matId)
{
	float dO = 0.0;

	for (int i = 0; i < MAX_STEPS; ++i) {
		vec3 p = ro + rd * dO;
		vec2 mapped = map(p);
		if (dO > maxDist || abs(mapped.x) < SURF_DIST) {
			matId = mapped.y;
			break;
		}
		dO += mapped.x;
	}

	return dO;
}

vec3 calcNormal(vec3 p ) // for function f(p)
{
    const float h = 0.5/90.0; // replace by an appropriate value
    const vec2 k = vec2(1,-1);
    return normalize( k.xyy*map( p + k.xyy*h ).x + 
                      k.yyx*map( p + k.yyx*h ).x + 
                      k.yxy*map( p + k.yxy*h ).x + 
                      k.xxx*map( p + k.xxx*h ).x );
}

const vec3 MaterialColors[9]=vec3[9](
	vec3(0,0,0),
	vec3(1, 0, 1),
	vec3(0, 0.4, 0.15),
	vec3(0.85, 0.7, 0.5),
    vec3(0.9, 0, 0),
    vec3(1, 1, 0.95),
    vec3(0.94, 0.8, 0),
    vec3(0.1, 0.1, 0.1),
    vec3(0.2, 0.4, 0.65)
);

void main()
{
    vec3 outCol = vec3(0.0);

    maxDist = sdfScale * 2.1;
    spriteTextureLocation = vec3(sdfSpriteData.xy,0);

    float matId;
    float d = rayMarch(ro, rd, matId);
    
    if(d >= maxDist){
       /* outFragment = vec4(1);
       return; */
       discard;
    }  

	vec3 pos = ro + d * rd;
	vec3 normal = calcNormal(pos);

    float lightDot = dot(normal, lightDirection);

    vec3 l = max(0.0, lightDot) * lightColor;
    l += max(0.0, -lightDot) *lightBounceColor;
    l += lightAmbientColor;

    int matColorId = int(matId)&0xF;
			
    vec3 matColor = MaterialColors[matColorId];

// TODO: Fix lighting
    if(matId < 2.0){
        outCol = matColor;
    }else{
        outCol = matColor * l;
    }

    outCol = mix(outCol,vec3(1), sdfSpriteData.w);

    outFragment = vec4(outCol,1);
    vec4 projectedDepth = projectionMatrix * vec4(0,0,pos.z,1);
    gl_FragDepth =(projectedDepth.z/projectedDepth.w)*0.5+0.5;//gl_FragCoord.z;
}