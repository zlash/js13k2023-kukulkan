
layout(location = 0) in vec2 _v;

#define uv _u
out vec2 uv;

#define ro _ro
out vec3 ro;

#define rd _rd
out vec3 rd;


#define viewMatrix _mv
uniform mat4 viewMatrix;

#define projectionMatrix _mp
uniform mat4 projectionMatrix;

void main()
{
        uv = vec2(_v.x, _v.y);
        gl_Position = vec4(_v, 0.0, 1.0);
        mat4 invViewProj = inverse(projectionMatrix * viewMatrix);
        
        vec4 p = invViewProj * vec4(uv, -1, 1);
        ro = p.xyz/p.w;
        vec4 p2 = invViewProj * vec4(uv, 1, 1);
        rd = normalize(p2.xyz/p2.w-ro);
}
