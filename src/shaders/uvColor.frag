#define outFragment _f
out vec4 outFragment; // Fragment Color

#define color _r
in vec4 color;

#define tex _s
uniform highp sampler2D tex;

#define uv _w
in vec3 uv;


void main()
{
    outFragment =  texture(tex,uv.xy) * color;
}
