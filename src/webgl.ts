import { viewResolution } from "./constants";
import { DEBUG } from "./autogenerated";
import * as glEnum from "./webglEnums";
import { assert } from "~aliasedFunctions";

export let gl: WebGL2RenderingContext;

const glReverseEnumLookUp = (value: any) => {
    let k = Object.getOwnPropertyNames(WebGL2RenderingContext).find(x => (WebGL2RenderingContext as any)[x] === value);
    return k || "<ENUM VALUE NOT FOUND>";
}

export const initWebgl = (canvas: HTMLCanvasElement) => {
    console.log("JS13k2023 - Debug Build - WebGL Init");

    assert(gl == null || gl == undefined);

    gl = canvas.getContext("webgl2", { alpha: false, powerPreference: "high-performance", antialias: true }) as WebGL2RenderingContext;
    if (!gl) {
        alert("Needs WebGL 2");
        throw new Error();
    }
    gl.clearColor(0.5, 0, 0.5, 1);
    gl.viewport(0, 0, canvas.width, canvas.height);
}


export const loadShader = (typeId: number, source: string) => {
    const shader = gl.createShader(typeId) as WebGLShader;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (DEBUG) {
        if (!gl.getShaderParameter(shader, glEnum.COMPILE_STATUS)) {
            console.warn(`FAILED SHADER: (TYPE ${glReverseEnumLookUp(typeId)})`);
            console.warn(`ERROR LOG`, gl.getShaderInfoLog(shader));
            console.warn("============================================");
            console.warn(source);
            gl.deleteShader(shader);
            throw new Error("SHADER COMPILATION FAILED!");
        }
    }
    return shader;
}

export const createProgramWithShaders = (shaders: [WebGLShader, WebGLShader]) => {
    const shaderProgram = gl.createProgram() as WebGLProgram;
    shaders.forEach(x => gl.attachShader(shaderProgram, x));
    gl.linkProgram(shaderProgram);

    if (DEBUG) {
        if (!gl.getProgramParameter(shaderProgram, glEnum.LINK_STATUS)) {
            console.error('Unable to link the shader program: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
    }

    gl.validateProgram(shaderProgram);

    if (DEBUG) {
        if (!gl.getProgramParameter(shaderProgram, glEnum.VALIDATE_STATUS)) {
            console.error('Unable to validate the shader program: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
    }

    shaders.forEach(x => gl.deleteShader(x));

    if (DEBUG) {
        console.log("Shader program linked");
    }

    return shaderProgram;
};

export interface WebGLShaderBundle {
    program: WebGLProgram;
    uniforms: { [index: string]: WebGLUniformLocation; };
};

export const createProgram = (vsSrc: string, fsSrc: string) => {
    const vertexShader = loadShader(glEnum.VERTEX_SHADER, vsSrc) as WebGLShader;
    const fragmentShader = loadShader(glEnum.FRAGMENT_SHADER, fsSrc) as WebGLShader;

    return {
        program: createProgramWithShaders([vertexShader, fragmentShader]) as WebGLProgram,
        uniforms: {},
    } as WebGLShaderBundle;
};

export const getUniformLocation = (prog: WebGLShaderBundle, name: string) => {
    prog.uniforms[name] = gl.getUniformLocation(prog.program, name) as WebGLUniformLocation;
};

export const createTexture = (tw: number, th: number, internalFormat: number, pixels: ArrayBufferView | null) => {
    const tex = gl.createTexture() as WebGLTexture;
    gl.bindTexture(glEnum.TEXTURE_2D, tex);

    gl.texImage2D(glEnum.TEXTURE_2D, 0, internalFormat,
        tw, th, 0,
        internalFormat == glEnum.RGBA ? glEnum.RGBA : glEnum.DEPTH_COMPONENT, internalFormat == glEnum.RGBA ? glEnum.UNSIGNED_BYTE : glEnum.FLOAT, pixels);

    gl.texParameteri(glEnum.TEXTURE_2D, glEnum.TEXTURE_MIN_FILTER, glEnum.NEAREST);
    gl.texParameteri(glEnum.TEXTURE_2D, glEnum.TEXTURE_MAG_FILTER, glEnum.NEAREST);

    gl.texParameteri(glEnum.TEXTURE_2D, glEnum.TEXTURE_WRAP_S, glEnum.CLAMP_TO_EDGE);
    gl.texParameteri(glEnum.TEXTURE_2D, glEnum.TEXTURE_WRAP_T, glEnum.CLAMP_TO_EDGE);
    return tex;
};

export const createTextureArray = (tw: number, th: number, nLayers: number, internalFormat: number) => {
    const tex = gl.createTexture() as WebGLTexture;
    gl.bindTexture(glEnum.TEXTURE_2D_ARRAY, tex);

    assert(internalFormat == glEnum.RGBA8);


    const levels = Math.log2(tw) + 1;

    gl.texStorage3D(glEnum.TEXTURE_2D_ARRAY, levels, internalFormat, tw, th, nLayers);

    gl.texParameteri(glEnum.TEXTURE_2D_ARRAY, glEnum.TEXTURE_MIN_FILTER, glEnum.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(glEnum.TEXTURE_2D_ARRAY, glEnum.TEXTURE_MAG_FILTER, glEnum.LINEAR);

    gl.texParameteri(glEnum.TEXTURE_2D_ARRAY, glEnum.TEXTURE_WRAP_S, glEnum.CLAMP_TO_EDGE);
    gl.texParameteri(glEnum.TEXTURE_2D_ARRAY, glEnum.TEXTURE_WRAP_T, glEnum.CLAMP_TO_EDGE);

    return {
        tex,
        w: tw,
        h: th,
        numLayers: nLayers,
        curLayer: 0,
        internalFormat,
    };
};

export type TextureArray = ReturnType<typeof createTextureArray>;

export const createTexture3d = (w: number, h: number, d: number, filter: number, repeat?: boolean, format?: number) => {
    const tex = gl.createTexture() as WebGLTexture;
    gl.bindTexture(glEnum.TEXTURE_3D, tex);

    const levels = 1;
    format = format ?? glEnum.R16F;


    gl.texStorage3D(glEnum.TEXTURE_3D, levels, format, w, h, d);

    gl.texParameteri(glEnum.TEXTURE_3D, glEnum.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(glEnum.TEXTURE_3D, glEnum.TEXTURE_MAG_FILTER, filter);

    const repeatFlag = repeat ? glEnum.REPEAT : glEnum.CLAMP_TO_EDGE;
    gl.texParameteri(glEnum.TEXTURE_3D, glEnum.TEXTURE_WRAP_S, repeatFlag);
    gl.texParameteri(glEnum.TEXTURE_3D, glEnum.TEXTURE_WRAP_T, repeatFlag);

    return {
        tex, w, h, d,
    };
};

export type Texture3d = ReturnType<typeof createTexture3d>;


export const texture3dSubdata = (tex: Texture3d, x: number, y: number, pixels: ArrayBufferView, w?: number, h?: number, components?: number) => {
    gl.bindTexture(glEnum.TEXTURE_3D, tex.tex);
    w = w ?? tex.d;
    h = h ?? tex.d;
    components = components ?? glEnum.RED;
    gl.texSubImage3D(glEnum.TEXTURE_3D, 0, x, y, 0, w, h, tex.d, components, glEnum.FLOAT, pixels);
};

export const pushTextureArrayLayer = (tex: TextureArray, pixels: ArrayBufferView) => {
    assert(tex.curLayer < tex.numLayers, "Texture array overflow!");
    gl.bindTexture(glEnum.TEXTURE_2D_ARRAY, tex.tex);
    gl.texSubImage3D(glEnum.TEXTURE_2D_ARRAY, 0, 0, 0, tex.curLayer++, tex.w, tex.h, 1, glEnum.RGBA, glEnum.UNSIGNED_BYTE, pixels);
};

export const resetFramebuffer = (w: number, h: number) => {
    gl.bindFramebuffer(glEnum.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
};

export const setFramebuffer = (fb: Framebuffer) => {
    gl.bindFramebuffer(glEnum.FRAMEBUFFER, fb.fb);
    gl.viewport(0, 0, fb.w, fb.h);
};

export const createFramebuffer = (w: number, h: number) => {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(glEnum.FRAMEBUFFER, fb);

    const colorTex = createTexture(w, h, glEnum.RGBA, null);
    gl.framebufferTexture2D(
        glEnum.FRAMEBUFFER, glEnum.COLOR_ATTACHMENT0, glEnum.TEXTURE_2D, colorTex, 0);

    const depthTex = createTexture(w, h, glEnum.DEPTH_COMPONENT32F, null);
    gl.framebufferTexture2D(
        glEnum.FRAMEBUFFER, glEnum.DEPTH_ATTACHMENT, glEnum.TEXTURE_2D, depthTex, 0);

    return { fb, colorTex, depthTex, w, h };
}

export type Framebuffer = ReturnType<typeof createFramebuffer>;

export const createUBO = (size: number) => {
    const buffer = gl.createBuffer() as WebGLBuffer;
    gl.bindBuffer(glEnum.UNIFORM_BUFFER, buffer);
    gl.bufferData(glEnum.UNIFORM_BUFFER, size, glEnum.DYNAMIC_DRAW);
    return buffer;
};