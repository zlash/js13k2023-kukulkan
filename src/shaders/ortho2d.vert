
layout(location = 0) in vec2 _v;
layout(location = 1) in vec3 _u;  // uv
layout(location = 2) in vec3 _c;  // cx, cy, rot
layout(location = 3) in vec4 _l;  // color

#define uv _w
out vec3 uv;

#define color _r
out vec4 color;

#define RES_W 600.0
#define RES_H 800.0

void main()
{
	uv = _u;
    color = _l;
    float ca = cos(_c.z);
    float sa = sin(_c.z);
    vec2 finalPos = mat2(ca, sa, -sa, ca) * _v + _c.xy;

	gl_Position = vec4((finalPos / vec2(RES_W, RES_H) - 0.5) * 2.0, 0.0, 1.0);
}
