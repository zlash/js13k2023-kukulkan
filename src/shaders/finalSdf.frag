#define outFragment _f

in vec2 uv;
out vec4 outFragment; // Fragment Color

#define uTime _ut
uniform float uTime;

uniform highp sampler3D _t;
uniform highp sampler3D _m;

#define MAX_SPRITES 200

layout(std140) uniform _b
{
    vec4 settings; // numSprites, 
	vec4 data[MAX_SPRITES]; // id, 
	vec4 posScale[MAX_SPRITES];
	vec4 qRotation[MAX_SPRITES];
};

#define AA 1

#define MAX_STEPS 100
#define MAX_DIST  16.0
#define SURF_DIST 0.001

#define S_MAX_STEPS 20
#define S_MAX_DIST  6.0
#define S_SURF_DIST 0.01


vec2 sampleBakedSdf(in vec3 p,float id){
	vec3 uvw = vec3(0.5,1.0,1.0)*(p+1.0)*0.5+vec3(float(id)*0.5,0.0,0.0);
	return vec2(texture(_t,uvw ).x,texture(_m,uvw ).x);
}
 
vec2 bakedSdf(in vec3 p,float id, in vec2 prev) {
	float lp = length(p);
	float sphereDist = lp-1.0;

	if(prev.x<sphereDist){
		return prev;
	}

 	if(lp > 1.0){
		vec2 samp = sampleBakedSdf(p/lp,id);
		return samp+vec2(sphereDist,0) ;
	}  

	return sampleBakedSdf(p,id); 
}

// https://iquilezles.org/articles/intersectors
/* bool sphIntersect( in vec3 ro, in vec3 rd, in vec3 ce, float ra )
{
    vec3 oc = ro - ce;
    float b = dot( oc, rd );
    float c = dot( oc, oc ) - ra*ra;
    float h = b*b - c;
	return !(h<0.0);
} */

vec2 smoothedSdf(in vec3 p,float id, vec4 posScale, vec2 prev) {
// raycast test
/*    if(rd!=vec3(0.0) && !sphIntersect(ro,rd,center,s)){
	return prevMin;
}    
 */
 vec2 samp = bakedSdf((p-posScale.xyz)/posScale.w,id,prev);
return samp*vec2(posScale.w,1);
}

vec2 materialMin(vec2 a,vec2 b){
	return (a.x<b.x)?a:b;
}

vec2 map(vec3 p){
	vec2 scene = vec2(p.z,0);
	//smoothedSdf(p-vec3(0.0,0.0,0.4+(1.0+sin(uTime*2.0))*0.5),0.0,r)
	int numSprites = int(settings.x);
	for(int i=0;i<numSprites;++i){
		scene = materialMin(scene,smoothedSdf(p,data[i].x,posScale[i],scene));
	}

	return scene-vec2(0.03,0);
}

// https://iquilezles.org/articles/rmshadows
float softshadow( in vec3 ro, in vec3 rd, float mint, float maxt, float w )
{
    float res = 1.0;
    float t = mint;
    for( int i=0; i<S_MAX_STEPS && t<maxt; i++ )
    {
        float h = map(ro + t*rd).x;
        res = min( res, h/(w*t) );
        t += clamp(h, 0.005, 0.50);
        if( res<-1.0 || t>maxt ) break;
    }
    res = max(res,-1.0);
    return (0.25*(1.0+res)*(1.0+res)*(2.0-res))>0.5?1.0:0.0; 
}

// https://iquilezles.org/articles/normalsSDF
 vec3 calcNormal( in vec3 pos )
{
    vec2 e = vec2(1.0,-1.0)*0.5773;
    const float eps = 0.0005;

	//const float eps = 0.08;
    return normalize( e.xyy*map( pos + e.xyy*eps ).x + 
					  e.yyx*map( pos + e.yyx*eps ).x + 
					  e.yxy*map( pos + e.yxy*eps  ).x + 
					  e.xxx*map( pos + e.xxx*eps  ).x );
} 
   

/*    vec3 calcNormal( in vec3 p ) // for function f(p)
{
    const float h = 0.01; // replace by an appropriate value
    const vec2 k = vec2(1,-1);
    return normalize( k.xyy*map( p + k.xyy*h ) + 
                      k.yyx*map( p + k.yyx*h ) + 
                      k.yxy*map( p + k.yxy*h ) + 
                      k.xxx*map( p + k.xxx*h ) );
}
 */
float rayMarch(vec3 ro, vec3 rd, out float matId)
{
	float dO = 0.0;

	for (int i = 0; i < MAX_STEPS; ++i) {
		vec3 p = ro + rd * dO;
		vec2 mapped = map(p);
		if (dO > MAX_DIST || abs(mapped.x) < SURF_DIST) {
			matId=mapped.y;
			break;
		}
		dO += mapped.x;
	}

	return dO;
}

float discreteDot(in vec3 a, in vec3 b) {
	return dot(a,b);
}

void main()
{
	vec3 finalCol = vec3(0.0);
	// Get from camera
	float viewPlaneSize = 4.5;
	float cRad = 5.0;
	float t =uTime;
	 vec3 vO = vec3(cos(t)*cRad, sin(t)*cRad, cRad);

    vec3 rd = normalize(-vO);
	vec3 vRight = normalize(cross(rd, vec3(0.0,0.0,1.0)));
	vec3 vUp = normalize(cross(rd,vRight));

	vec2 planePos = viewPlaneSize * uv;
	vec3 ro = vO + planePos.x*vRight + planePos.y*vUp;

	for (int m = 0; m < AA; m++) {
		for (int n = 0; n < AA; n++) {
			float matId;
			float d = rayMarch(ro, rd, matId);
			vec3 outCol = vec3(0.0);
			if (d < MAX_DIST) {
				vec3 pos = ro + d * rd;
				vec3 nor = calcNormal(pos);
				vec3 difDir =vec3(0.7,0.6,0.4);
				float shadow = softshadow(pos, difDir,0.1,S_MAX_DIST,0.1);
				float dif = shadow*clamp( discreteDot(nor,difDir), 0.0, 1.0 );
				float amb = 0.5 + 0.5*discreteDot(nor,vec3(0.0,0.8,0.6));
				vec3 matColor = vec3(0.2,0.3,0.4);
				if(matId==1.0){
					matColor=vec3(0.0,0.0,1.0);
				}
				if(matId==2.0){
					matColor=vec3(1.0,0.0,0.0);
				}
				outCol = matColor*amb + vec3(0.8,0.7,0.5)*dif;
			}
			finalCol += outCol;
		}
	}
	finalCol /= float(AA * AA);

	outFragment = vec4(finalCol, 0.0);
}
