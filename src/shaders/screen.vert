
layout(location = 0) in vec2 _v;

#define uv _w
out vec3 uv;

#define color _r
out vec4 color;

void main()
{
	uv = vec3(_v.xy * 0.5 + 0.5, 0);
	gl_Position = vec4(_v, 0.0, 1.0);
	color = vec4(1);
}
