import bpy
import math
from mathutils import Vector

# 斑海豹 v3

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def _get_socket(collection, names):
    if collection is None:
        return None
    for name in names:
        try:
            sock = collection.get(name)
        except Exception:
            sock = None
        if sock is not None:
            return sock
    return None

def _set_input(node, names, value):
    if node is None:
        return None
    sock = _get_socket(getattr(node, 'inputs', None), names)
    if sock is not None:
        try:
            sock.default_value = value
        except Exception:
            pass
    return sock

def _link(nt, from_socket, to_socket):
    if nt is None or from_socket is None or to_socket is None:
        return False
    try:
        nt.links.new(from_socket, to_socket)
        return True
    except Exception:
        return False

def make_mat(name, color, roughness=0.6, metallic=0.0,
             noise_scale=None, noise_strength=0.0, noise_detail=3.0,
             color_b=None, subsurface=0.0, coat=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (260, 0)
    out.location = (560, 0)

    _set_input(bsdf, ['Base Color'], (*color, 1.0))
    _set_input(bsdf, ['Roughness'], roughness)
    _set_input(bsdf, ['Metallic'], metallic)
    _set_input(bsdf, ['Subsurface Weight', 'Subsurface'], subsurface)
    _set_input(bsdf, ['Coat Weight', 'Coat'], coat)
    _set_input(bsdf, ['Specular IOR Level', 'Specular'], 0.35)
    _set_input(bsdf, ['Sheen Weight', 'Sheen'], 0.05)

    _link(nt, _get_socket(getattr(bsdf, 'outputs', None), ['BSDF']), _get_socket(getattr(out, 'inputs', None), ['Surface']))

    if noise_scale:
        noise = nt.nodes.new('ShaderNodeTexNoise')
        noise.location = (-620, 90)
        noise.inputs['Scale'].default_value = noise_scale
        noise.inputs['Detail'].default_value = noise_detail
        noise.inputs['Roughness'].default_value = 0.55

        if color_b is not None:
            ramp = nt.nodes.new('ShaderNodeValToRGB')
            ramp.location = (-360, 150)
            ramp.color_ramp.elements[0].position = 0.28
            ramp.color_ramp.elements[0].color = (*color, 1.0)
            ramp.color_ramp.elements[1].position = 0.74
            ramp.color_ramp.elements[1].color = (*color_b, 1.0)
            _link(nt, _get_socket(getattr(noise, 'outputs', None), ['Fac']), _get_socket(getattr(ramp, 'inputs', None), ['Fac']))
            _link(nt, _get_socket(getattr(ramp, 'outputs', None), ['Color']), _get_socket(getattr(bsdf, 'inputs', None), ['Base Color']))

        bump = nt.nodes.new('ShaderNodeBump')
        bump.location = (-80, -120)
        bump.inputs['Strength'].default_value = noise_strength
        bump.inputs['Distance'].default_value = 0.065
        _link(nt, _get_socket(getattr(noise, 'outputs', None), ['Fac']), _get_socket(getattr(bump, 'inputs', None), ['Height']))
        _link(nt, _get_socket(getattr(bump, 'outputs', None), ['Normal']), _get_socket(getattr(bsdf, 'inputs', None), ['Normal']))

    return mat

def add_uv_sphere(name, loc, scale, mat, segments=32, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        location=loc
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    return obj

def add_ico_sphere(name, loc, scale, mat, subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions,
        location=loc
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    return obj

def add_curve_tube(name, points, radius, mat, bevel_res=3):
    curve = bpy.data.curves.new(name, type='CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 8
    curve.bevel_depth = radius
    curve.bevel_resolution = bevel_res
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for bp, co in zip(spline.bezier_points, points):
        bp.co = co
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    if mat:
        curve.materials.append(mat)
    return obj

def parent_to_bone(obj, armature, bone_name):
    world_matrix = obj.matrix_world.copy()
    obj.parent = armature
    obj.parent_type = 'BONE'
    obj.parent_bone = bone_name
    obj.matrix_world = world_matrix

def smooth_object(obj):
    if obj.type == 'MESH':
        for p in obj.data.polygons:
            p.use_smooth = True

def add_soft_edges(obj, width=0.035, segments=2):
    if obj.type != 'MESH':
        return
    bevel = obj.modifiers.new('Soft_Edge', 'BEVEL')
    bevel.width = width
    bevel.segments = segments
    bevel.limit_method = 'ANGLE'
    bevel.angle_limit = math.radians(35)

def add_spot(name, loc, scale, rotation, mat):
    obj = add_uv_sphere(name, loc, scale, mat, 20, 12)
    obj.rotation_euler = rotation
    return obj

def _make_spot_pattern_nodes(nt, base_color, spot_color,
                             noise_scale=3.8, voronoi_scale=6.0):
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    geo.location = (-900, 260)

    vor = nt.nodes.new('ShaderNodeTexVoronoi')
    vor.location = (-700, 300)
    vor.voronoi_dimensions = '3D'
    vor.feature = 'F1'
    vor.distance = 'EUCLIDEAN'
    vor.inputs['Scale'].default_value = voronoi_scale
    if vor.inputs.get('Randomness'):
        vor.inputs['Randomness'].default_value = 0.78

    vor_ramp = nt.nodes.new('ShaderNodeValToRGB')
    vor_ramp.location = (-470, 300)
    vor_ramp.color_ramp.elements[0].position = 0.08
    vor_ramp.color_ramp.elements[0].color = (0.02, 0.02, 0.02, 1.0)
    vor_ramp.color_ramp.elements[1].position = 0.28
    vor_ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)

    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.location = (-700, 40)
    noise.inputs['Scale'].default_value = noise_scale
    noise.inputs['Detail'].default_value = 4.0
    noise.inputs['Roughness'].default_value = 0.68
    if noise.inputs.get('Distortion'):
        noise.inputs['Distortion'].default_value = 0.30

    noise_ramp = nt.nodes.new('ShaderNodeValToRGB')
    noise_ramp.location = (-470, 30)
    noise_ramp.color_ramp.elements[0].position = 0.30
    noise_ramp.color_ramp.elements[0].color = (0.15, 0.15, 0.15, 1.0)
    noise_ramp.color_ramp.elements[1].position = 0.68
    noise_ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)

    multiply = nt.nodes.new('ShaderNodeMixRGB')
    multiply.blend_type = 'MULTIPLY'
    multiply.inputs[0].default_value = 0.85
    multiply.location = (-220, 180)

    color_mix = nt.nodes.new('ShaderNodeMixRGB')
    color_mix.blend_type = 'MIX'
    color_mix.location = (30, 160)
    color_mix.inputs[1].default_value = (*base_color, 1.0)
    color_mix.inputs[2].default_value = (*spot_color, 1.0)

    _link(nt, geo.outputs.get('Position'), vor.inputs.get('Vector'))
    _link(nt, geo.outputs.get('Position'), noise.inputs.get('Vector'))
    _link(nt, vor.outputs.get('Distance'), vor_ramp.inputs.get('Fac'))
    _link(nt, noise.outputs.get('Fac'), noise_ramp.inputs.get('Fac'))
    _link(nt, vor_ramp.outputs.get('Color'), multiply.inputs[1])
    _link(nt, noise_ramp.outputs.get('Color'), multiply.inputs[2])
    _link(nt, multiply.outputs.get('Color'), color_mix.inputs[0])

    return color_mix, multiply

def make_spotted_mat(name, base_color, spot_color, roughness=0.76,
                     noise_scale=95.0, noise_strength=0.055,
                     noise_detail=3.2, color_b=None,
                     subsurface=0.045, coat=0.05):
    mat = make_mat(
        name, base_color, roughness,
        noise_scale=noise_scale, noise_strength=noise_strength,
        noise_detail=noise_detail, color_b=color_b,
        subsurface=subsurface, coat=coat
    )
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled'), None)
    if bsdf is None:
        return mat

    color_mix, _ = _make_spot_pattern_nodes(
        nt, base_color, spot_color,
        noise_scale=3.8, voronoi_scale=6.2
    )
    _link(nt, color_mix.outputs.get('Color'), _get_socket(bsdf.inputs, ['Base Color']))
    return mat

def make_spotted_fur_strand_material(name='Seal_FurStrands_V3_4'):
    mat = make_fur_strand_material(name)
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled'), None)
    if bsdf is None:
        return mat

    color_mix, _ = _make_spot_pattern_nodes(
        nt,
        (0.57, 0.63, 0.66),
        (0.18, 0.23, 0.25),
        noise_scale=4.0, voronoi_scale=6.3
    )
    _link(nt, color_mix.outputs.get('Color'), _get_socket(bsdf.inputs, ['Base Color']))
    return mat

def make_fur_strand_material(name='Seal_FurStrands_V3'):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (0.57, 0.63, 0.66, 1.0)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new('ShaderNodeOutputMaterial')
    out.location = (520, 0)

    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (230, 0)

    _set_input(bsdf, ['Base Color'], (0.57, 0.63, 0.66, 1.0))
    _set_input(bsdf, ['Roughness'], 0.88)
    _set_input(bsdf, ['Specular IOR Level', 'Specular'], 0.22)
    _set_input(bsdf, ['Sheen Weight', 'Sheen'], 0.18)
    _set_input(bsdf, ['Sheen Roughness'], 0.75)

    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.location = (-460, 80)
    noise.inputs['Scale'].default_value = 38.0
    noise.inputs['Detail'].default_value = 2.0
    noise.inputs['Roughness'].default_value = 0.55

    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.location = (-210, 90)
    ramp.color_ramp.elements[0].position = 0.28
    ramp.color_ramp.elements[0].color = (0.48, 0.54, 0.57, 1.0)
    ramp.color_ramp.elements[1].position = 0.72
    ramp.color_ramp.elements[1].color = (0.68, 0.72, 0.74, 1.0)

    _link(nt, _get_socket(getattr(noise, 'outputs', None), ['Fac']), _get_socket(getattr(ramp, 'inputs', None), ['Fac']))
    _link(nt, _get_socket(getattr(ramp, 'outputs', None), ['Color']), _get_socket(getattr(bsdf, 'inputs', None), ['Base Color']))
    _link(nt, _get_socket(getattr(bsdf, 'outputs', None), ['BSDF']), _get_socket(getattr(out, 'inputs', None), ['Surface']))
    return mat

def _socket(node, names, required=True):
    for name in names:
        sock = node.inputs.get(name)
        if sock is not None:
            return sock
    if required:
        raise RuntimeError(f'Node {node.bl_idname} missing sockets: {names}')
    return None

def _set_group_io(group):
    if hasattr(group, 'interface'):
        group.interface.new_socket(
            name='Geometry',
            in_out='INPUT',
            socket_type='NodeSocketGeometry'
        )
        group.interface.new_socket(
            name='Geometry',
            in_out='OUTPUT',
            socket_type='NodeSocketGeometry'
        )
    else:
        group.inputs.new('NodeSocketGeometry', 'Geometry')
        group.outputs.new('NodeSocketGeometry', 'Geometry')

def add_short_fur(obj, fur_material, density=130.0, hair_length=0.021,
                  hair_radius=0.00135, name_suffix=''):
    if obj.type != 'MESH':
        return None

    ng_name = f'GN_SealShortFur_V3_3_{obj.name}'
    ng = bpy.data.node_groups.get(ng_name)
    if ng is None:
        ng = bpy.data.node_groups.new(ng_name, 'GeometryNodeTree')
    else:
        ng.nodes.clear()
        if hasattr(ng, 'interface'):
            try:
                for item in list(ng.interface.items_tree):
                    ng.interface.remove(item)
            except Exception:
                pass
        else:
            try:
                ng.inputs.clear()
                ng.outputs.clear()
            except Exception:
                pass

    _set_group_io(ng)

    nodes = ng.nodes
    links = ng.links

    group_in = nodes.new('NodeGroupInput')
    group_in.location = (-820, 100)

    group_out = nodes.new('NodeGroupOutput')
    group_out.location = (760, 100)

    distribute = nodes.new('GeometryNodeDistributePointsOnFaces')
    distribute.location = (-610, 120)
    distribute.distribute_method = 'RANDOM'
    density_socket = _socket(distribute, ['Density'], True)
    density_socket.default_value = float(density)

    cone = nodes.new('GeometryNodeMeshCone')
    cone.location = (-610, -100)

    v = _socket(cone, ['Vertices'], False)
    if v is not None:
        v.default_value = 4

    r1 = _socket(cone, ['Radius 1', 'Radius 1 (Base)'], False)
    r2 = _socket(cone, ['Radius 2', 'Radius 2 (Tip)'], False)
    dep = _socket(cone, ['Depth'], False)

    if r1 is not None:
        r1.default_value = float(hair_radius)
    if r2 is not None:
        r2.default_value = float(hair_radius * 0.10)
    if dep is not None:
        dep.default_value = float(hair_length)

    transform = nodes.new('GeometryNodeTransform')
    transform.location = (-390, -100)
    trans = _get_socket(transform.inputs, ['Translation'])
    if trans is not None:
        trans.default_value = (0.0, 0.0, hair_length * 0.5)

    _link(
        ng,
        _get_socket(cone.outputs, ['Mesh', 'Geometry']),
        _get_socket(transform.inputs, ['Geometry'])
    )

    align = None
    for node_type in ('FunctionNodeAlignRotationToVector', 'FunctionNodeAlignEulerToVector'):
        try:
            align = nodes.new(node_type)
            break
        except Exception:
            continue

    if align is not None:
        align.location = (-390, 160)
        try:
            align.axis = 'Z'
        except Exception:
            pass
        try:
            align.pivot_axis = 'AUTO'
        except Exception:
            pass
        _link(
            ng,
            _get_socket(distribute.outputs, ['Normal']),
            _get_socket(align.inputs, ['Vector'])
        )

    instance = nodes.new('GeometryNodeInstanceOnPoints')
    instance.location = (-70, 100)

    _link(
        ng,
        _get_socket(distribute.outputs, ['Points']),
        _get_socket(instance.inputs, ['Points'])
    )
    _link(
        ng,
        _get_socket(transform.outputs, ['Geometry']),
        _get_socket(instance.inputs, ['Instance'])
    )

    if align is not None:
        _link(
            ng,
            _get_socket(align.outputs, ['Rotation']),
            _get_socket(instance.inputs, ['Rotation'])
        )

    rand_xy = nodes.new('FunctionNodeRandomValue')
    rand_xy.data_type = 'FLOAT'
    rand_xy.location = (-60, -120)
    _set_input(rand_xy, ['Min'], 0.82)
    _set_input(rand_xy, ['Max'], 1.12)

    rand_z = nodes.new('FunctionNodeRandomValue')
    rand_z.data_type = 'FLOAT'
    rand_z.location = (-60, -230)
    _set_input(rand_z, ['Min'], 0.72)
    _set_input(rand_z, ['Max'], 1.22)

    combine = nodes.new('ShaderNodeCombineXYZ')
    combine.location = (120, -100)
    _link(ng, _get_socket(rand_xy.outputs, ['Value']), _get_socket(combine.inputs, ['X']))
    _link(ng, _get_socket(rand_xy.outputs, ['Value']), _get_socket(combine.inputs, ['Y']))
    _link(ng, _get_socket(rand_z.outputs, ['Value']), _get_socket(combine.inputs, ['Z']))

    scale_instances = nodes.new('GeometryNodeScaleInstances')
    scale_instances.location = (160, 90)
    _link(ng, _get_socket(instance.outputs, ['Instances']), _get_socket(scale_instances.inputs, ['Instances']))
    _link(ng, _get_socket(combine.outputs, ['Vector']), _get_socket(scale_instances.inputs, ['Scale']))

    set_mat = nodes.new('GeometryNodeSetMaterial')
    set_mat.location = (390, 90)
    mat_socket = _get_socket(set_mat.inputs, ['Material'])
    if mat_socket is not None:
        mat_socket.default_value = fur_material

    _link(
        ng,
        _get_socket(scale_instances.outputs, ['Instances']),
        _get_socket(set_mat.inputs, ['Geometry'])
    )

    join = nodes.new('GeometryNodeJoinGeometry')
    join.location = (590, 100)

    _link(
        ng,
        _get_socket(group_in.outputs, ['Geometry']),
        _get_socket(join.inputs, ['Geometry'])
    )
    _link(
        ng,
        _get_socket(set_mat.outputs, ['Geometry']),
        _get_socket(join.inputs, ['Geometry'])
    )
    _link(
        ng,
        _get_socket(join.outputs, ['Geometry']),
        _get_socket(group_out.inputs, ['Geometry'])
    )

    modifier = obj.modifiers.get('Short_Fur_V3_3')
    if modifier is None:
        modifier = obj.modifiers.new('Short_Fur_V3_3', 'NODES')

    modifier.node_group = ng
    modifier.show_viewport = True
    modifier.show_render = True

    obj['Fur_Density'] = float(density)
    obj['Fur_Length_m'] = float(hair_length)
    obj['Fur_Style'] = '轻量化短绒 / 实例毛束'
    return modifier

def add_stylized_fur(parts, m):
    strand = m['fur_strand']

    targets = [
        (parts['body'], 125.0, 0.021),
        (parts['belly'], 95.0, 0.019),
        (parts['neck'], 145.0, 0.021),
        (parts['head'], 175.0, 0.021),
        (parts['flipper_l'], 115.0, 0.019),
        (parts['flipper_r'], 115.0, 0.019),
        (parts['tail_l'], 105.0, 0.019),
        (parts['tail_r'], 105.0, 0.019),
    ]
    for idx, (obj, density, length) in enumerate(targets):
        try:
            add_short_fur(
                obj, strand,
                density=density,
                hair_length=length,
                hair_radius=0.00135 if obj == parts['head'] else 0.00145,
                name_suffix=f'_{idx:02d}'
            )
        except Exception as exc:
            print(f'[Fur warning] {obj.name}: {exc}')

def create_materials():
    fur = make_spotted_mat(
        'Seal_Fur_V3_4_Spotted',
        (0.52, 0.59, 0.63),
        (0.18, 0.23, 0.25),
        0.76,
        noise_scale=95.0, noise_strength=0.055, noise_detail=3.2,
        color_b=(0.66, 0.71, 0.73), subsurface=0.045, coat=0.05
    )
    belly = make_mat(
        'Seal_Belly_V2',
        (0.73, 0.78, 0.80), 0.82,
        noise_scale=110.0, noise_strength=0.045, noise_detail=3.0,
        color_b=(0.82, 0.85, 0.86), subsurface=0.055, coat=0.03
    )
    spot = make_mat(
        'Seal_Spots_V2',
        (0.12, 0.17, 0.19), 0.83,
        noise_scale=110.0, noise_strength=0.035, noise_detail=2.0,
        color_b=(0.22, 0.27, 0.29)
    )
    nose = make_mat(
        'Seal_Nose_V2',
        (0.018, 0.024, 0.028), 0.30,
        noise_scale=75.0, noise_strength=0.055, noise_detail=2.4,
        color_b=(0.055, 0.065, 0.070), coat=0.18
    )
    eye = make_mat(
        'Seal_Eye_V2',
        (0.004, 0.006, 0.008), 0.09,
        noise_scale=8.0, noise_strength=0.012, noise_detail=2.0,
        color_b=(0.018, 0.022, 0.026), coat=0.55
    )
    eye_hi = make_mat('Seal_Eye_Highlight_V2', (0.98, 0.995, 1.0), 0.055, coat=0.15)
    mouth = make_mat('Seal_Mouth_V2', (0.16, 0.045, 0.055), 0.48, coat=0.05)
    inner = make_mat(
        'Seal_InnerFlipper_V2',
        (0.34, 0.40, 0.42), 0.80,
        noise_scale=95.0, noise_strength=0.04, noise_detail=2.6,
        color_b=(0.44, 0.49, 0.50)
    )
    fur_strand = make_spotted_fur_strand_material()
    return {
        'fur': fur, 'fur_light': belly, 'spot': spot, 'nose': nose,
        'eye': eye, 'eye_hi': eye_hi, 'mouth': mouth,
        'inner_flipper': inner, 'fur_strand': fur_strand,
        'bone': make_mat('BoneDebug_V2', (0.8, 0.65, 0.35), 0.7),
    }

def create_seal(m):
    body = add_uv_sphere(
        'SEAL_Body',
        (0, 0, 0.58),
        (1.42, 1.88, 0.92),
        m['fur'],
        48, 28
    )

    belly = add_uv_sphere(
        'SEAL_Belly',
        (0, 0.25, 0.52),
        (1.12, 1.48, 0.70),
        m['fur_light'],
        40, 24
    )

    neck = add_uv_sphere(
        'SEAL_Neck',
        (0, 1.20, 0.76),
        (1.16, 1.00, 0.86),
        m['fur'],
        40, 24
    )

    head = add_uv_sphere(
        'SEAL_Head',
        (0, 1.86, 0.88),
        (1.25, 1.15, 1.05),
        m['fur'],
        48, 28
    )

    muzzle_l = add_uv_sphere(
        'Muzzle_L', (-0.27, 2.67, 0.72),
        (0.43, 0.40, 0.30), m['fur_light'], 32, 20
    )
    muzzle_r = add_uv_sphere(
        'Muzzle_R', (0.27, 2.67, 0.72),
        (0.43, 0.40, 0.30), m['fur_light'], 32, 20
    )

    nose = add_uv_sphere(
        'Nose', (0, 2.99, 0.78),
        (0.22, 0.16, 0.18), m['nose'], 32, 20
    )

    mouth_l = add_curve_tube(
        'Mouth_L', [(0, 2.88, 0.66), (-0.08, 2.76, 0.55), (-0.20, 2.70, 0.57)],
        0.025, m['mouth'], 3
    )
    mouth_r = add_curve_tube(
        'Mouth_R', [(0, 2.88, 0.66), (0.08, 2.76, 0.55), (0.20, 2.70, 0.57)],
        0.025, m['mouth'], 3
    )

    eye_z = 1.14
    eye_y = 2.875
    eye_x = 0.54
    eyes = []
    for side, x in [('L', -eye_x), ('R', eye_x)]:
        eye = add_uv_sphere(
            f'Eye_{side}', (x, eye_y, eye_z),
            (0.225, 0.115, 0.255), m['eye'], 32, 20
        )
        eye.rotation_euler[0] = math.radians(-8)
        eyes.append(eye)

        hi = add_ico_sphere(
            f'EyeHighlight_{side}', (x - 0.08 if x < 0 else x + 0.08,
                                     eye_y + 0.105, eye_z + 0.095),
            (0.050, 0.026, 0.054), m['eye_hi'], 2
        )
        eyes.append(hi)

    for i, dx in enumerate((-0.30, -0.17, 0.17, 0.30)):
        z = 0.66 + (0.055 if abs(dx) < 0.2 else 0)
        add_ico_sphere(
            f'WhiskerDot_{i}',
            (dx, 2.78, z),
            (0.035, 0.025, 0.035),
            m['spot'], 1
        )

    flipper_l = add_uv_sphere(
        'Flipper_L', (-1.12, 0.55, 0.20),
        (0.42, 0.80, 0.20), m['fur'], 32, 18
    )
    flipper_l.rotation_euler = (math.radians(8), math.radians(-10), math.radians(-18))

    flipper_r = add_uv_sphere(
        'Flipper_R', (1.12, 0.55, 0.20),
        (0.42, 0.80, 0.20), m['fur'], 32, 18
    )
    flipper_r.rotation_euler = (math.radians(8), math.radians(10), math.radians(18))

    inner_l = add_uv_sphere(
        'FlipperInner_L', (-1.18, 0.49, 0.18),
        (0.28, 0.60, 0.12), m['inner_flipper'], 24, 14
    )
    inner_r = add_uv_sphere(
        'FlipperInner_R', (1.18, 0.49, 0.18),
        (0.28, 0.60, 0.12), m['inner_flipper'], 24, 14
    )

    tail_l = add_uv_sphere(
        'Tail_L', (-0.48, -1.98, 0.44),
        (0.50, 0.78, 0.22), m['fur'], 32, 18
    )
    tail_l.rotation_euler[2] = math.radians(-12)

    tail_r = add_uv_sphere(
        'Tail_R', (0.48, -1.98, 0.44),
        (0.50, 0.78, 0.22), m['fur'], 32, 18
    )
    tail_r.rotation_euler[2] = math.radians(12)

    spots = []

    all_parts = [body, belly, neck, head, muzzle_l, muzzle_r, nose,
                 mouth_l, mouth_r, *eyes, flipper_l, flipper_r, inner_l,
                 inner_r, tail_l, tail_r, *spots]
    for obj in all_parts:
        if hasattr(obj, 'type'):
            smooth_object(obj)

    for obj in [body, belly, neck, head, muzzle_l, muzzle_r, nose, flipper_l, flipper_r, inner_l, inner_r, tail_l, tail_r]:
        add_soft_edges(obj, 0.025 if obj is not nose else 0.015, 2)

    return {
        'body': body, 'belly': belly, 'neck': neck, 'head': head,
        'muzzle_l': muzzle_l, 'muzzle_r': muzzle_r, 'nose': nose,
        'mouth_l': mouth_l, 'mouth_r': mouth_r,
        'flipper_l': flipper_l, 'flipper_r': flipper_r,
        'inner_l': inner_l, 'inner_r': inner_r,
        'tail_l': tail_l, 'tail_r': tail_r,
        'eyes': eyes, 'spots': spots,
    }

def create_armature():
    arm_data = bpy.data.armatures.new('Seal_Rig')
    arm = bpy.data.objects.new('Seal_Rig', arm_data)
    bpy.context.collection.objects.link(arm)
    arm.show_in_front = True
    arm_data.display_type = 'BBONE'

    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')

    def bone(name, head, tail, parent=None, use_connect=False):
        eb = arm_data.edit_bones.new(name)
        eb.head = head
        eb.tail = tail
        if parent:
            eb.parent = arm_data.edit_bones[parent]
            eb.use_connect = use_connect
        return eb

    bone('root', (0, 0, 0.15), (0, 0, 0.65))
    bone('spine_01', (0, -0.90, 0.62), (0, 0.0, 0.75), 'root', False)
    bone('spine_02', (0, 0.0, 0.75), (0, 0.85, 0.82), 'spine_01', True)
    bone('neck', (0, 0.82, 0.82), (0, 1.48, 0.90), 'spine_02', True)
    bone('head', (0, 1.45, 0.90), (0, 2.45, 0.88), 'neck', True)

    bone('flipper_L', (-0.78, 0.94, 0.38), (-1.25, 0.18, 0.20), 'spine_02', False)
    bone('flipper_R', ( 0.78, 0.94, 0.38), ( 1.25, 0.18, 0.20), 'spine_02', False)

    bone('tail_base', (0, -1.45, 0.60), (0, -1.95, 0.48), 'spine_01', False)
    bone('tail_L', (-0.10, -1.92, 0.48), (-0.52, -2.30, 0.43), 'tail_base', False)
    bone('tail_R', (0.10, -1.92, 0.48), (0.52, -2.30, 0.43), 'tail_base', False)

    bpy.ops.object.mode_set(mode='POSE')
    for pbone in arm.pose.bones:
        pbone.rotation_mode = 'XYZ'
    bpy.ops.object.mode_set(mode='OBJECT')

    return arm

def create_rig_ui(arm):
    arm['Character'] = 'Q版幼年期斑海豹'
    arm['Rig_Notes'] = '分件绑定：身体/头/前鳍/尾鳍；前鳍骨骼根部已对齐肩部并沿鳍长轴；Geometry Nodes 短绒毛会跟随部件。'
    arm['Authoring_Script'] = 'q_seal_blender_V3_5_flipper_rig_fixed.py'
    arm['Flipper_Rig_Fix'] = '肩部为旋转支点，骨骼沿前鳍长度方向；左右镜像。'

def bind_parts(parts, arm):
    parent_to_bone(parts['body'], arm, 'spine_01')
    parent_to_bone(parts['belly'], arm, 'spine_01')
    parent_to_bone(parts['neck'], arm, 'neck')
    parent_to_bone(parts['head'], arm, 'head')
    parent_to_bone(parts['muzzle_l'], arm, 'head')
    parent_to_bone(parts['muzzle_r'], arm, 'head')
    parent_to_bone(parts['nose'], arm, 'head')
    parent_to_bone(parts['mouth_l'], arm, 'head')
    parent_to_bone(parts['mouth_r'], arm, 'head')

    for obj in parts['eyes']:
        parent_to_bone(obj, arm, 'head')

    parent_to_bone(parts['flipper_l'], arm, 'flipper_L')
    parent_to_bone(parts['inner_l'], arm, 'flipper_L')
    parent_to_bone(parts['flipper_r'], arm, 'flipper_R')
    parent_to_bone(parts['inner_r'], arm, 'flipper_R')

    parent_to_bone(parts['tail_l'], arm, 'tail_L')
    parent_to_bone(parts['tail_r'], arm, 'tail_R')

    for spot in parts['spots']:
        if spot.location.y > 1.35:
            parent_to_bone(spot, arm, 'head')
        else:
            parent_to_bone(spot, arm, 'spine_01')

def point_light_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

def create_camera_and_lights():
    bpy.ops.object.camera_add(location=(5.75, 7.8, 3.35))
    cam = bpy.context.object
    cam.name = 'Camera'
    bpy.context.scene.camera = cam
    target = Vector((0, 0.55, 0.82))
    point_light_at(cam, target)
    cam.data.lens = 58

    def area(name, loc, energy, size, target):
        bpy.ops.object.light_add(type='AREA', location=loc)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.shape = 'DISK'
        light.data.size = size
        point_light_at(light, target)
        return light

    area('Key_Softbox', (3.8, 4.5, 5.8), 850, 4.8, (0, 0.6, 0.85))
    area('Fill_Softbox', (-4.0, 2.0, 3.4), 420, 4.0, (0, 0.75, 0.9))
    area('Rim_Softbox', (0.5, -3.8, 4.4), 760, 3.5, (0, 0.1, 1.0))
    area('Top_Softbox', (-0.5, 0.8, 6.2), 300, 3.0, (0, 0.7, 0.4))

def set_world_and_render():
    world = bpy.context.scene.world or bpy.data.worlds.new('Seal_World')
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get('Background')
    if bg:
        bg.inputs['Color'].default_value = (0.58, 0.70, 0.76, 1.0)
        bg.inputs['Strength'].default_value = 0.26

    scene = bpy.context.scene
    engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
    scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'
    scene.render.resolution_x = 820
    scene.render.resolution_y = 820
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = 'RGBA'

    try:
        scene.view_settings.look = 'AgX - Medium High Contrast'
    except Exception:
        pass

def add_collections():
    root = bpy.data.collections.get('Q_Seal_Character') or bpy.data.collections.new('Q_Seal_Character')
    if root.name not in [c.name for c in bpy.context.scene.collection.children]:
        bpy.context.scene.collection.children.link(root)

def remove_ground_objects_and_material():
    for obj in list(bpy.data.objects):
        if obj.name == 'Ground' or obj.get('is_seal_ground'):
            bpy.data.objects.remove(obj, do_unlink=True)
    for mat in list(bpy.data.materials):
        if mat.name.startswith('Seal_Ground'):
            try:
                bpy.data.materials.remove(mat)
            except Exception:
                pass

def main():
    clear_scene()
    remove_ground_objects_and_material()
    m = create_materials()
    parts = create_seal(m)
    arm = create_armature()
    create_rig_ui(arm)
    bind_parts(parts, arm)
    add_stylized_fur(parts, m)
    add_collections()
    create_camera_and_lights()
    set_world_and_render()

    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm

    bpy.context.scene['README'] = (
        '进入 Pose Mode 可旋转骨骼。'
    )

    print('=== 斑海豹 V3.5  ===')
    print('Armature: Seal_Rig')
    print('Pose bones: root, spine_01, spine_02, neck, head, flipper_L/R, tail_base, tail_L/R')

if __name__ == '__main__':
    main()
