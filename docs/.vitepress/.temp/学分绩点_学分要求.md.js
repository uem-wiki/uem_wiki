import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"学分要求","description":"","frontmatter":{},"headers":[],"relativePath":"学分绩点/学分要求.md","filePath":"学分绩点/学分要求.md"}');
const _sfc_main = { name: "学分绩点/学分要求.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="学分要求" tabindex="-1">学分要求 <a class="header-anchor" href="#学分要求" aria-label="Permalink to &quot;学分要求&quot;">​</a></h1><blockquote><p>本文介绍毕业所需的学分要求（具体以学校最新规定为准）</p></blockquote><h2 id="学分构成" tabindex="-1">学分构成 <a class="header-anchor" href="#学分构成" aria-label="Permalink to &quot;学分构成&quot;">​</a></h2><table tabindex="0"><thead><tr><th>类别</th><th>学分要求</th><th>说明</th></tr></thead><tbody><tr><td>公共必修课</td><td>~40 学分</td><td>思政、英语、体育等</td></tr><tr><td>专业必修课</td><td>~50 学分</td><td>专业核心课程</td></tr><tr><td>专业选修课</td><td>~20 学分</td><td>专业方向课程</td></tr><tr><td>公共选修课</td><td>~10 学分</td><td>跨专业选修</td></tr><tr><td>实践环节</td><td>~20 学分</td><td>实习、毕设等</td></tr><tr><td><strong>总计</strong></td><td><strong>~140 学分</strong></td><td>具体以学校最新规定为准</td></tr></tbody></table><h2 id="各学期建议学分" tabindex="-1">各学期建议学分 <a class="header-anchor" href="#各学期建议学分" aria-label="Permalink to &quot;各学期建议学分&quot;">​</a></h2><table tabindex="0"><thead><tr><th>学期</th><th>建议学分</th><th>说明</th></tr></thead><tbody><tr><td>大一上</td><td>20-25</td><td>适应期，不宜过多</td></tr><tr><td>大一下</td><td>22-27</td><td>逐渐增加</td></tr><tr><td>大二上</td><td>25-30</td><td>专业课增加</td></tr><tr><td>大二下</td><td>25-30</td><td>保持稳定</td></tr><tr><td>大三上</td><td>20-25</td><td>开始考虑方向</td></tr><tr><td>大三下</td><td>15-20</td><td>准备实习/考研</td></tr><tr><td>大四上</td><td>10-15</td><td>毕设/实习</td></tr><tr><td>大四下</td><td>5-10</td><td>毕业冲刺</td></tr></tbody></table><h2 id="学分规划建议" tabindex="-1">学分规划建议 <a class="header-anchor" href="#学分规划建议" aria-label="Permalink to &quot;学分规划建议&quot;">​</a></h2><ol><li><strong>均匀分布</strong>：不要把课程都堆在一个学期</li><li><strong>难易搭配</strong>：每个学期搭配难度不同的课程</li><li><strong>预留空间</strong>：为选修课和兴趣课程留出空间</li><li><strong>及时补修</strong>：如果有挂科，及时补修</li></ol><h2 id="注意事项" tabindex="-1">注意事项 <a class="header-anchor" href="#注意事项" aria-label="Permalink to &quot;注意事项&quot;">​</a></h2><ul><li>每学期最多选 30 学分（以学校最新规定为准）</li><li>挂科需要补修，影响毕业时间</li><li>转专业可能需要补修前专业课程</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("学分绩点/学分要求.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const ____ = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  ____ as default
};
