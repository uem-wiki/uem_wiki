import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"体育课选择","description":"","frontmatter":{},"headers":[],"relativePath":"校园生活/体育课选择.md","filePath":"校园生活/体育课选择.md"}');
const _sfc_main = { name: "校园生活/体育课选择.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="体育课选择" tabindex="-1">体育课选择 <a class="header-anchor" href="#体育课选择" aria-label="Permalink to &quot;体育课选择&quot;">​</a></h1><blockquote><p>选择适合自己的体育课，让体育课成为大学生活的乐趣</p></blockquote><h2 id="可选项目" tabindex="-1">可选项目 <a class="header-anchor" href="#可选项目" aria-label="Permalink to &quot;可选项目&quot;">​</a></h2><table tabindex="0"><thead><tr><th>项目</th><th>难度</th><th>推荐指数</th><th>说明</th></tr></thead><tbody><tr><td>篮球</td><td></td><td></td><td>热门，需要一定基础</td></tr><tr><td>足球</td><td></td><td></td><td>团队运动，氛围好</td></tr><tr><td>羽毛球</td><td></td><td></td><td>上手快，适合女生</td></tr><tr><td>乒乓球</td><td></td><td></td><td>国球，容易拿高分</td></tr><tr><td>健美操</td><td></td><td></td><td>女生热门，轻松有趣</td></tr><tr><td>太极拳</td><td></td><td></td><td>简单，适合不想太累的</td></tr><tr><td>游泳</td><td></td><td></td><td>实用技能，但需会游泳</td></tr><tr><td>田径</td><td></td><td></td><td>较累，但锻炼效果好</td></tr></tbody></table><h2 id="选择建议" tabindex="-1">选择建议 <a class="header-anchor" href="#选择建议" aria-label="Permalink to &quot;选择建议&quot;">​</a></h2><h3 id="按基础选择" tabindex="-1">按基础选择 <a class="header-anchor" href="#按基础选择" aria-label="Permalink to &quot;按基础选择&quot;">​</a></h3><ul><li><strong>零基础</strong>：乒乓球、太极拳、健美操</li><li><strong>有一定基础</strong>：羽毛球、篮球</li><li><strong>运动达人</strong>：足球、游泳、田径</li></ul><h3 id="按目标选择" tabindex="-1">按目标选择 <a class="header-anchor" href="#按目标选择" aria-label="Permalink to &quot;按目标选择&quot;">​</a></h3><ul><li><strong>想拿高分</strong>：乒乓球、太极拳（评分标准相对宽松）</li><li><strong>想锻炼身体</strong>：篮球、足球、田径</li><li><strong>想学技能</strong>：游泳（实用性强）</li></ul><h3 id="按时间选择" tabindex="-1">按时间选择 <a class="header-anchor" href="#按时间选择" aria-label="Permalink to &quot;按时间选择&quot;">​</a></h3><ul><li><strong>早上有课</strong>：选择上午的体育课</li><li><strong>下午有课</strong>：选择下午的体育课</li><li><strong>想周末锻炼</strong>：选择周末班（如有）</li></ul><h2 id="注意事项" tabindex="-1">注意事项 <a class="header-anchor" href="#注意事项" aria-label="Permalink to &quot;注意事项&quot;">​</a></h2><ol><li>选课时注意时间冲突</li><li>部分项目有身体条件限制</li><li>游泳课需要自备泳衣泳镜</li><li>运动服装和鞋子要合适</li></ol></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("校园生活/体育课选择.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _____ = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _____ as default
};
