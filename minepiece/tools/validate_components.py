import json, glob, sys
from jsonschema import Draft7Validator, RefResolver

SCHEMA_VERSION = "1.21.80"
REPO = "/home/user/bedrock-samples"

item_schema = json.load(open(f"{REPO}/metadata/json_schemas/server/item/{SCHEMA_VERSION}/Components.json"))
item_resolver = RefResolver.from_schema(item_schema)

entity_schema_path = f"{REPO}/metadata/json_schemas/server/entity/{SCHEMA_VERSION}/Entity component definitions.json"
entity_schema = json.load(open(entity_schema_path))
entity_resolver = RefResolver.from_schema(entity_schema)

BLOCK_SCHEMA_VERSION = "1.21.110"
block_schema_full = json.load(open(f"{REPO}/metadata/json_schemas/server/block/{BLOCK_SCHEMA_VERSION}/Blocks.json"))
block_components_schema = block_schema_full["definitions"]["2556852513"]
block_resolver = RefResolver.from_schema(block_schema_full)


def validate_components(components, schema_props, resolver, label):
    errors = []
    for key, value in components.items():
        if key not in schema_props:
            errors.append(f"  UNKNOWN COMPONENT: {key}")
            continue
        prop_schema = schema_props[key]
        try:
            validator = Draft7Validator(prop_schema, resolver=resolver)
            for err in validator.iter_errors(value):
                errors.append(f"  {key}: {err.message} (at {list(err.path)})")
        except Exception as e:
            errors.append(f"  {key}: VALIDATOR ERROR: {e}")
    return errors


any_errors = False

print(f"=== ITEMS (schema {SCHEMA_VERSION}) ===")
for f in sorted(glob.glob("/home/user/bedrock-samples/minepiece/behavior_pack/items/*.json")):
    d = json.load(open(f))
    components = d["minecraft:item"]["components"]
    errs = validate_components(components, item_schema["properties"], item_resolver, f)
    if errs:
        any_errors = True
        print(f"{f}:")
        for e in errs:
            print(e)

print(f"\n=== ENTITIES (schema {SCHEMA_VERSION}) ===")
for f in sorted(glob.glob("/home/user/bedrock-samples/minepiece/behavior_pack/entities/*.json")):
    d = json.load(open(f))
    components = d["minecraft:entity"]["components"]
    errs = validate_components(components, entity_schema["properties"], entity_resolver, f)
    if errs:
        any_errors = True
        print(f"{f}:")
        for e in errs:
            print(e)

print(f"\n=== BLOCKS (schema {BLOCK_SCHEMA_VERSION}) ===")
for f in sorted(glob.glob("/home/user/bedrock-samples/minepiece/behavior_pack/blocks/*.json")):
    d = json.load(open(f))
    components = d["minecraft:block"]["components"]
    errs = validate_components(components, block_components_schema["properties"], block_resolver, f)
    if errs:
        any_errors = True
        print(f"{f}:")
        for e in errs:
            print(e)

if not any_errors:
    print("\nNo component errors found.")
else:
    print("\nErrors found above.")
