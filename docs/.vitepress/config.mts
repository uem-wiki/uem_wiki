import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '应大 Wiki',
  description: '应急管理大学新生指南',
  cleanUrls: true,
  ignoreDeadLinks: true,
  themeConfig: {
    nav: [
      { text: '首页', link: '/' }
    ],
    sidebar: [
      {
        text: '写在前面',link: '/写在前面/',
        items: [

        ]
      },
      {
        text: '入学指南',link: '/入学指南/README',
        items: [
          { text: '来校路线', link: '/入学指南/来校路线' },
          { text: '报到流程', link: '/入学指南/报到流程' },
          { text: '军训须知', link: '/入学指南/军训须知' },
          { text: '防骗指南', link: '/入学指南/防骗指南' }
        ]
      },
      {
        text: '选课指南',link: '/选课指南/README',
        items: [
          { text: '选课流程', link: '/选课指南/选课流程' },
          { text: '推荐课程', link: '/选课指南/推荐课程' },
          { text: '选课时间线', link: '/选课指南/选课时间线' }
        ]
      },
      {
        text: '校园生活',link: '/校园生活/README',
        items: [
          
          { text: '体育课选择', link: '/校园生活/体育课选择' },
          { text: '体测要求', link: '/校园生活/体测要求' },
          { text: '公交指南', link: '/校园生活/公交指南' },
          { text: '地铁指南', link: '/校园生活/地铁指南' },
          { text: '学生组织', link: '/校园生活/学生组织' },
          { text: '宿舍篇', link: '/校园生活/宿舍篇' },
          { text: '常用电话', link: '/校园生活/常用电话' },
          { text: '心理健康', link: '/校园生活/心理健康' },          
          { text: '校园地图', link: '/校园生活/校园地图' },
          { text: '食堂篇', link: '/校园生活/食堂篇' },
          { text: '恋爱', link: '/校园生活/恋爱' },

          
        ]
      }
    ],
    search: {
      provider: 'local'
    }
  },
  vite: {
    server: {
      fs: {
        allow: ['..']
      }
    }
  }
})
