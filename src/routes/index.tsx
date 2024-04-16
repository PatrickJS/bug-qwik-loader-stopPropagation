import { component$, sync$, $, useStore } from "@builder.io/qwik";

export const Node = component$(({ node, selected, onUpdate, i }: any) => {
  return (
    <div
      style={{
        border: selected.name === node ? "1px solid blue" : "1px solid green",
        padding: 10,
      }}
      // @ts-ignore
      // stopPropagation:click
      // stoppropagation:click
      onClick$={[
        sync$((e) => {
          // debugger;
          // e.stopPropagation();
          // e.stopImmediatePropagation();
          // console.log("1 sync fn");
        }),
        $((e) => {
          // console.log("2 async fn", e.cancelBubble);
          // debugger;
          // e.stopPropagation();
          console.log(node.name);
          return onUpdate(node.name);
        }),
        sync$((e) => {
          // e.stopPropagation();
        }),
        sync$(async (e) => {
          await new Promise((resolve) => setTimeout(resolve, 0));
          e.stopPropagation();
        }),
        sync$((e) => {
          // console.log("sync fn", e.cancelBubble);
          // e.stopPropagation();
        }),
        $((e) => {
          // console.log("async fn", e.cancelBubble);
        }),
      ]}
    >
      {node.name}
      {node.children &&
        node.children.map((node: any, ii) => (
          <Node
            key={`${ii}-${i}`}
            node={node}
            selected={selected}
            onUpdate={onUpdate}
          />
        ))}
    </div>
  );
});

export const Tree = component$(({ tree, selected, onUpdate }: any) => {
  return tree.children.map((node: any, i) => (
    <Node key={i} node={node} selected={selected} onUpdate={onUpdate} i={i} />
  ));
});

export const App = component$(() => {
  const selected = useStore({
    name: "",
    count: 0,
  });

  const onUpdate = $((name: string) => {
    selected.name = name;
    selected.count = selected.count + 1;
  });

  const tree = {
    name: "Root",
    children: [
      {
        name: "R Left",
        children: [
          {
            name: "R Left Left",
            children: [],
          },
        ],
      },
      {
        name: "R Right",
        children: [],
      },
    ],
  };

  return <Tree tree={tree} selected={selected} onUpdate={onUpdate} />;
});

export default App;
