import { createRoot } from "react-dom/client";
import { NodeEditor, GetSchemes, ClassicPreset } from "rete";
import { AreaPlugin, AreaExtensions } from "rete-area-plugin";
import {
  ConnectionPlugin,
  Presets as ConnectionPresets
} from "rete-connection-plugin";
import { ReactPlugin, Presets, ReactArea2D } from "rete-react-plugin";
import {
  ReroutePlugin,
  RerouteExtensions,
  RerouteExtra
} from "rete-connection-reroute-plugin";

type Schemes = GetSchemes<
  ClassicPreset.Node,
  ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>
>;
type AreaExtra = ReactArea2D<Schemes> | RerouteExtra;

export async function createEditor(container: HTMLElement) {
  const socket = new ClassicPreset.Socket("socket");

  const editor = new NodeEditor<Schemes>();
  const area = new AreaPlugin<Schemes, AreaExtra>(container);
  const connection = new ConnectionPlugin<Schemes, AreaExtra>();
  const render = new ReactPlugin<Schemes, AreaExtra>({ createRoot });

  const reroutePlugin = new ReroutePlugin<Schemes>();

  const selector = AreaExtensions.selector();
  const selectorAccumulating = AreaExtensions.accumulateOnCtrl();

  RerouteExtensions.selectablePins(
    reroutePlugin,
    selector,
    selectorAccumulating
  );

  // @ts-ignore
  render.use(reroutePlugin);

  render.addPreset(
    Presets.reroute.setup({
      pointerdown(id) {
        reroutePlugin.unselect(id);
        reroutePlugin.select(id);
      },
      contextMenu(id) {
        reroutePlugin.remove(id);
      },
      translate(id, dx, dy) {
        reroutePlugin.translate(id, dx, dy);
      }
    })
  );

  connection.addPreset(ConnectionPresets.classic.setup());

  AreaExtensions.selectableNodes(area, selector, {
    accumulating: selectorAccumulating
  });

  render.addPreset(Presets.classic.setup());

  editor.use(area);
  area.use(connection);
  area.use(render);

  AreaExtensions.simpleNodesOrder(area);

  const a = new ClassicPreset.Node("A");
  a.addControl("a", new ClassicPreset.InputControl("text", {}));
  a.addOutput("a", new ClassicPreset.Output(socket));
  await editor.addNode(a);

  const b = new ClassicPreset.Node("B");
  b.addControl("b", new ClassicPreset.InputControl("text", {}));
  b.addInput("b", new ClassicPreset.Input(socket));
  await editor.addNode(b);

  const conn1 = new ClassicPreset.Connection(a, "a", b, "b");
  const conn2 = new ClassicPreset.Connection(a, "a", b, "b");

  await editor.addConnection(conn1);
  await editor.addConnection(conn2);

  await area.translate(a.id, { x: 0, y: 0 });
  await area.translate(b.id, { x: 400, y: 0 });

  reroutePlugin.add(conn1.id, { x: 300, y: -50 });
  reroutePlugin.add(conn2.id, { x: 300, y: 200 });

  setTimeout(() => {
    AreaExtensions.zoomAt(area, editor.getNodes());
  }, 100);

  return {
    destroy: () => area.destroy()
  };
}
