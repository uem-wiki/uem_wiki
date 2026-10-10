import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{"layout":"home","hero":{"name":"应大 Wiki","text":"应急管理大学新生指南","tagline":"共享同一套 Markdown 文档的新首页测试版","actions":[{"theme":"brand","text":"开始阅读","link":"/写在前面/"}]},"features":[{"title":"入学指南","details":"报到、军训、交通与防骗信息","link":"/入学指南/README"},{"title":"选课与学业","details":"选课、学分、绩点与毕业要求","link":"/选课指南/README"},{"title":"校园生活","details":"宿舍、食堂、校历与生活贴士","link":"/校园生活/README"}]},"headers":[],"relativePath":"index.md","filePath":"index.md"}');
const _sfc_main = { name: "index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
