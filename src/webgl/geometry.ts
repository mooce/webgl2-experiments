import { vec2, vec3 } from "gl-matrix";
import Shader from "./shader";

interface Geometry {
  attributes: { [key: string]: { offset: number; components: number } };
  stride: number;
  count: number;
  buffer: WebGLBuffer;
  indices?: WebGLBuffer;
}

function getAttributesInfo(attributes: {
  [key: string]: { data: number[]; components: number };
}): { size: number; stride: number } {
  let stride = 0;
  let size = 0;

  for (const name in attributes) {
    const { components, data } = attributes[name];
    stride += components;
    size += data.length;
  }

  return { stride, size };
}

export function createInterleavedBuffer(
  gl: WebGLRenderingContext,
  attributes: { [key: string]: { data: number[]; components: number } },
  indicies: number[] | undefined = undefined
): Geometry {
  const { stride, size } = getAttributesInfo(attributes);
  const output: { [key: string]: { offset: number; components: number } } = {};
  const array = new Float32Array(size);
  let offset = 0;
  let count = 0;

  for (const name in attributes) {
    const attribute = attributes[name];
    let writeIdx = offset;

    output[name] = { offset, components: attribute.components };

    for (let i = 0; i < attribute.data.length; i++) {
      array[writeIdx] = attribute.data[i];
      if (i % attribute.components === attribute.components - 1) {
        writeIdx += stride - attribute.components + 1;
      } else {
        writeIdx++;
      }
    }
    offset += attribute.components;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);

  let indexBuffer = undefined;

  if (indicies) {
    const indexArray = new Uint16Array(indicies);
    indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArray, gl.STATIC_DRAW);

    count = indicies.length / 3;
  } else {
    count = size / stride;
  }

  return {
    buffer,
    attributes: output,
    stride,
    count,
    indices: indexBuffer
  };
}

export function bindBufferAndProgram(
  gl: WebGLRenderingContext,
  shader: Shader,
  geometry: Geometry
) {
  gl.bindBuffer(gl.ARRAY_BUFFER, geometry.buffer);

  for (const name in geometry.attributes) {
    const attribute = geometry.attributes[name];

    const index = shader.getAttributeIndex(gl, name);

    gl.vertexAttribPointer(
      index,
      attribute.components,
      gl.FLOAT,
      false,
      geometry.stride * Float32Array.BYTES_PER_ELEMENT,
      attribute.offset * Float32Array.BYTES_PER_ELEMENT
    );

    gl.enableVertexAttribArray(index);
  }

  if (geometry.indices) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indices);
  }

  shader.use(gl);
}

export function drawBuffer(
  gl: WebGLRenderingContext,
  geometry: Geometry,
  mode: number = gl.TRIANGLES
) {
  if (geometry.indices) {
    gl.drawElements(mode, geometry.count * 3, gl.UNSIGNED_SHORT, 0);
  } else {
    gl.drawArrays(mode, 0, geometry.count);
  }
}

export function computeTangent(
  v1: vec3,
  v2: vec3,
  v3: vec3,
  w1: vec2,
  w2: vec2,
  w3: vec2
): vec3 {
  const edge1 = vec3.create();
  const edge2 = vec3.create();

  vec3.sub(edge1, v2, v1);
  vec3.sub(edge2, v3, v1);

  const deltaUV1 = vec2.create();
  const deltaUV2 = vec2.create();

  vec2.sub(deltaUV1, w2, w1);
  vec2.sub(deltaUV2, w3, w1);

  const r = 1.0 / (deltaUV1[0] * deltaUV2[1] - deltaUV2[0] * deltaUV1[1]);

  const t = vec3.create();
  const s = vec3.create();

  vec3.set(
    t,
    (deltaUV2[1] * edge1[0] - deltaUV1[1] * edge2[0]) * r,
    (deltaUV2[1] * edge1[1] - deltaUV1[1] * edge2[1]) * r,
    (deltaUV2[1] * edge1[2] - deltaUV1[1] * edge2[2]) * r
  );

  vec3.set(
    s,
    (-deltaUV2[0] * edge1[0] + deltaUV1[0] * edge2[0]) * r,
    (-deltaUV2[0] * edge1[1] + deltaUV1[0] * edge2[1]) * r,
    (-deltaUV2[0] * edge1[2] + deltaUV1[0] * edge2[2]) * r
  );

  const tnorm = vec3.create();
  const bnorm = vec3.create();
  const nnorm = vec3.create();

  vec3.normalize(tnorm, t);
  vec3.normalize(bnorm, s);
  vec3.cross(nnorm, tnorm, bnorm);

  return tnorm;
}

export function createAxis(gl: WebGLRenderingContext, radius: number = 5) {
  return createInterleavedBuffer(
    gl,
    {
      position: {
        components: 3,
        data: [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2]
      },
      color: {
        components: 3,
        data: [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1].map(
          v => v * 0.5 + 0.25
        )
      }
    },
    [0, 1, 2, 3, 4, 5]
  );
}

export function createLight(gl: WebGLRenderingContext, radius: number = 1) {
  return createInterleavedBuffer(
    gl,
    {
      position: {
        components: 3,
        data: [-1, 0, 0, 1, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, -1, 0, 0, 1].map(
          v => v * radius * 0.5
        )
      },
      color: {
        components: 3,
        data: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
      }
    },
    [0, 1, 2, 3, 4, 5]
  );
}

export function loadGeometry(
  gl: WebGLRenderingContext,
  geometry: {
    indices: number[];
    position: number[];
    texcoord: number[];
    normal: number[];
  }
) {

  const tangents = []

  for (var i = 0; i < geometry.indices.length; i += 3) {
    const i0 = geometry.indices[i + 0];
    const i1 = geometry.indices[i + 1];
    const i2 = geometry.indices[i + 2];

    const pos = (idx: number) => {
      const v = vec3.create();
      vec3.set(
        v,
        geometry.position[idx * 3 + 0],
        geometry.position[idx * 3 + 1],
        geometry.position[idx * 3 + 2]
      );
      return v;
    };

    const tex = (idx: number) => {
      const v = vec2.create();
      vec2.set(v, geometry.texcoord[idx * 2 + 0], geometry.texcoord[idx * 2 + 1]);
      return v;
    };

    const tangent = computeTangent(pos(i0), pos(i1), pos(i2), tex(i0), tex(i1), tex(i2));

    tangents[i0 * 3 + 0] = tangent[0];
    tangents[i0 * 3 + 1] = tangent[1];
    tangents[i0 * 3 + 2] = tangent[2];

    tangents[i1 * 3 + 0] = tangent[0];
    tangents[i1 * 3 + 1] = tangent[1];
    tangents[i1 * 3 + 2] = tangent[2];

    tangents[i2 * 3 + 0] = tangent[0];
    tangents[i2 * 3 + 1] = tangent[1];
    tangents[i2 * 3 + 2] = tangent[2];
  }

  return createInterleavedBuffer(
    gl,
    {
      position: {
        components: 3,
        data: geometry.position
      },
      normal: {
        components: 3,
        data: geometry.normal
      },
      texcoord: {
        components: 2,
        data: geometry.texcoord
      },
      tangent: {
        components: 3,
        data: tangents
      }
    },
    geometry.indices
  );
}
