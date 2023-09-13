
#define vert _q
layout(location = 0) in vec2 _q;

#define viewMatrix _mv
uniform mat4 viewMatrix;

#define projectionMatrix _mp
uniform mat4 projectionMatrix;

#define MAX_SPRITES 200

layout(std140) uniform _b
{
    vec4 settings; // numSprites, 
	vec4 data[MAX_SPRITES]; // id *2, material 2 id, material 2 alpha
	vec4 posScale[MAX_SPRITES];
	vec4 qRotation[MAX_SPRITES];
};

#define center _ic
out vec3 center;

#define ro _ro
out vec3 ro;

#define rd _rd
out vec3 rd;

#define sdfSpriteData _sd
out vec4 sdfSpriteData;

#define sdfScale _ss 
out float sdfScale;

#define invViewRotation _vr
out mat3 invViewRotation;

mat3 quaternionToMatrix(vec4 q)
{
    vec2 pm = vec2(1.0, -1.0);
    return mat3(
        mat4 (
            q.wzyx * pm.xxyx,
            q.zwxy * pm.yxxx,
            q.yxwz * pm.xyxx,
            q.xyzw * pm.yyyx
        ) *
        mat4 (
            q.wzyx * pm.xxyy,
            q.zwxy * pm.yxxy,
            q.yxwz * pm.xyxy,
            q.xyzw * pm.xxxx
        )
    );
}

vec3 project(mat4 m, vec3 v) {
    vec4 p = m * vec4(v, 1);
    return (p/p.w).xyz;
}

void main()
{
    center = (viewMatrix * vec4(posScale[gl_InstanceID].xyz, 1)).xyz;
    sdfScale = posScale[gl_InstanceID].w;

    sdfSpriteData = data[gl_InstanceID];
    invViewRotation =  inverse(mat3(viewMatrix) * quaternionToMatrix( qRotation[gl_InstanceID]));
	
    vec3 projCenter = project(projectionMatrix, center);
    vec3 proj = project(projectionMatrix, center.xyz + vec3(vert, 1) * sdfScale);
    vec3 projBack = project(projectionMatrix, center.xyz + vec3(vert, -1) * sdfScale);

    if(abs(projBack.x-projCenter.x)>abs(proj.x-projCenter.x)) proj.x=projBack.x;
    if(abs(projBack.y-projCenter.y)>abs(proj.y-projCenter.y)) proj.y=projBack.y; 

    gl_Position = vec4(proj, 1);
    mat4 invProj = inverse(projectionMatrix);
    ro = project(invProj, proj);

    vec4 posBack = inverse(projectionMatrix) * vec4(gl_Position.xy,1,1);
    rd = normalize(posBack.xyz/posBack.w - ro.xyz);
}
