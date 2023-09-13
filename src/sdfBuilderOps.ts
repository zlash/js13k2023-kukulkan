// Shapes
export const Sphere = 1;
export const Box = 2;
export const Cylinder = 3; // radius, halfHeight
export const PMan = 4; // aperture, radius, extrusion H

// Combinations
export const Union = 30;
export const SmoothUnion = 31;
export const Subtract = 32;
export const Intersect = 33;
export const SmoothSubtract = 34;

// Transforms 
export const PopTranslationRotation = 100;
export const PopScale = 101;
export const Translate = 102;
export const RotateXY = 103;
export const RotateXZ = 104;
export const RotateYZ = 105;
export const Elongate = 106;
export const Smooth = 107;
export const Scale = 108;
export const Symmetry = 109;
export const Onion = 110;
export const PopOnion = 111;

// Materials
export const PushMaterial = 200;
export const PopMaterial = 201;