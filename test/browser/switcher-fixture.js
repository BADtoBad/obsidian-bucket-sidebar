// App-independent seed only. The plugin's actual view, settings tab, persist,
// Space switch and creation dialog implementations are bundled ahead of this.
import { FileIconManager } from '../../obsidian-notion-craft-suite/plugin/src/fileIconManager';
import { normalizeFileIconSettings } from '../../obsidian-notion-craft-suite/plugin/src/fileIconModel';
import { NativeFileExplorerEnhancer } from '../../obsidian-notion-craft-suite/plugin/src/nativeFileExplorer';
import { ShellControls } from '../../obsidian-notion-craft-suite/plugin/src/shellControls';
const fixtureFiles = new Map();
for (const name of ['未命名.md', '秋季活动策划案.md', '秋季活动执行记录.md']) {
  const file = new TFile(); file.path = name; file.name = name; file.extension = 'md'; file.basename = name.slice(0,-3); fixtureFiles.set(name,file);
}
const fixtureLeaf = {app:null,view:null};
const fixtureApp = {metadataCache:{getFileCache:file=>({frontmatter:{created:file.created}})},plugins:{enabledPlugins:new Set()},vault:{getAbstractFileByPath:p=>fixtureFiles.get(p)||null,
  getRoot:()=>Object.assign(new TFolder(),{path:'',name:'',children:[...fixtureFiles.values()].filter(f=>!f.path.includes('/'))}),
  async create(path,content){
    await new Promise(r=>setTimeout(r,25));
    if(window.bucketFixture.failCreate)throw Error('Synthetic permission failure');
    const make=()=>{const file=new TFile();Object.assign(file,{path,name:path.split('/').pop(),basename:path.split('/').pop().slice(0,-3),extension:'md',content});fixtureFiles.set(path,file);fixtureFiles.get(path.slice(0,path.lastIndexOf('/')))?.children.push(file);return file;};
    if(window.bucketFixture.raceCreate){window.bucketFixture.raceCreate=false;make();throw Error('Synthetic concurrent create');}
    if(fixtureFiles.has(path))throw Error('File exists');
    return make();
  },
  async createFolder(path){
    await new Promise(r=>setTimeout(r,25));
    if(window.bucketFixture.failFolderCreate)throw Error('Synthetic folder permission failure');
    const parent=fixtureFiles.get(path.slice(0,path.lastIndexOf('/')));
    if(!(parent instanceof TFolder))throw Error('Missing parent');
    if(fixtureFiles.has(path))throw Error('File exists');
    const folder=Object.assign(new TFolder(),{path,name:path.split('/').pop(),children:[]});
    fixtureFiles.set(path,folder);parent.children.push(folder);
    if(window.bucketFixture.raceFolderCreate){window.bucketFixture.raceFolderCreate=false;throw Error('Synthetic concurrent folder create');}
    return folder;
  }},workspace:{
  getActiveFile:()=>fixtureFiles.get('秋季活动执行记录.md'),
  getLeavesOfType:type=>type==='file-explorer'?(window.bucketFixture?.nativeLeaf?[window.bucketFixture.nativeLeaf]:[]):[fixtureLeaf],
  iterateAllLeaves:cb=>{if(fixtureLeaf.view)cb(fixtureLeaf);if(window.bucketFixture?.nativeLeaf)cb(window.bucketFixture.nativeLeaf);},
  getLeaf:()=>({view:{containerEl:document.querySelector('#new-note')},async openFile(file){window.bucketFixture.opened=file.path;}}),
}};
fixtureLeaf.app=fixtureApp;
const fixturePlugin=new BucketSidebarPlugin(fixtureApp);
let fixtureView;
let fixtureSaved;
fixturePlugin.saveData=async data=>{fixtureSaved=JSON.parse(JSON.stringify(data));};
const fixtureWait=()=>new Promise(resolve=>setTimeout(resolve,60));
window.bucketFixture={
  async mountSort(width=300){
    await this.mount({width});
    const folder=Object.assign(new TFolder(),{path:'Inbox',name:'Inbox',children:[]});
    const sub=Object.assign(new TFolder(),{path:'Inbox/子文件夹',name:'子文件夹',children:[]});
    fixtureFiles.set(folder.path,folder);fixtureFiles.set(sub.path,sub);folder.children.push(sub);
    const values=[['A 最早.md','2026-09-01',50],['B 无属性.PDF',undefined,new Date(2026,8,14).getTime()],['C 昨天.md','2026-09-15',30],['D 今天.md','2026-09-16',1],['E 同日稍晚.md','2026-09-15',40]];
    for(const [name,created,ctime] of values){const file=Object.assign(new TFile(),{path:`Inbox/${name}`,name,basename:name.replace(/\.(md|PDF)$/,''),extension:name.split('.').pop(),created,stat:{ctime,mtime:9999999999999}});fixtureFiles.set(file.path,file);folder.children.push(file);}
    fixturePlugin.activeSpace.pinnedEntries=[];
    fixturePlugin.activeSpace.buckets[0].entries=[{id:'sort-folder',type:'folder',path:'Inbox',expanded:true}];
    fixtureView.render();this.plugin=fixturePlugin;this.view=fixtureView;
    await fixtureWait();
  },
  sortNames(){return [...document.querySelectorAll('.bucket-nested-row')].map(el=>el.dataset.bucketPath.split('/').pop());},
  async setSort(order){fixturePlugin.changeFolderSort('Inbox',order);await fixtureWait();return this.sortNames();},
  async reloadSort(){fixturePlugin.data=normalizeData(fixtureSaved);fixtureView.render();await fixtureWait();return this.sortNames();},
  openSort(){fixturePlugin.promptFolderSort('Inbox');},
  async undoSort(){fixturePlugin.undo();await fixtureWait();return this.sortNames();},
  startShell(){this.shell?.stop();this.shell=new ShellControls(document);this.shell.start();},
  async mount({names=true,count=2,pinned=true,width=340}={}){
    document.querySelector('#pane').style.width=`${width}px`;
    document.querySelector('#settings').replaceChildren();
    fixturePlugin.data=normalizeData({version:2,activeSpaceId:'work',settings:{showSpaceNames:names,rowHeight:32},spaces:Array.from({length:count},(_,i)=>({
      id:i===0?'work':`space-${i}`,name:i===0?'工作':i===1?'读书':`项目 ${i+1} 较长的空间名称`,icon:i===0?'briefcase':i===1?'book-open':'layers',
      pinnedEntries:pinned?[{id:`pin-${i}`,type:'file',path:'未命名.md'}]:[],
      buckets:[{id:`group-${i}-1`,name:'工作项目',entries:[{id:`entry-${i}-1`,type:'file',path:'秋季活动策划案.md'},{id:`entry-${i}-2`,type:'file',path:'秋季活动执行记录.md'}]},{id:`group-${i}-2`,name:'创意写作',entries:[]}],
    }))});
    fixtureView=new BucketSidebarView(fixtureLeaf,fixturePlugin);fixtureLeaf.view=fixtureView;
    await fixtureView.onOpen();
    const settings=new BucketSidebarSettingTab(fixtureApp,fixturePlugin);settings.display();
    await fixtureWait();return this.measure();
  },
  measure(){
    const root=document.querySelector('.bucket-sidebar-root'),pill=root.querySelector('.bucket-space-switcher'),tabs=root.querySelector('.bucket-space-tabs'),add=root.querySelector('.bucket-space-add');
    const p=pill.getBoundingClientRect(),a=add.getBoundingClientRect(),s=getComputedStyle(pill);
    const groups=[...root.querySelectorAll('.bucket-section')],heading=root.querySelector('.bucket-groups-heading'),pin=root.querySelector('.bucket-pinned-section');
    const headingStyle=heading&&getComputedStyle(heading);
    const groupGap=groups[1].getBoundingClientRect().top-groups[0].getBoundingClientRect().bottom;
    const boundary=heading?heading.getBoundingClientRect().top+parseFloat(headingStyle.paddingTop)+parseFloat(headingStyle.borderTopWidth)-pin.getBoundingClientRect().bottom:0;
    const w=pill.parentElement.getBoundingClientRect();
    return {centerError:(p.left+p.right-w.left-w.right)/2,radius:s.borderRadius,border:s.borderTopWidth,fill:s.backgroundColor,pillWidth:p.width,rootWidth:root.clientWidth,plusInset:p.right-a.right,plusInside:a.left>=p.left&&a.top>=p.top&&a.bottom<=p.bottom,tabsWidth:tabs.clientWidth,tabsTotal:tabs.scrollWidth,groupGap,boundary,line:headingStyle?.borderTopWidth||'0px',pinned:!!pin,names:root.querySelectorAll('.bucket-space-tab-label').length,buttons:[...tabs.children].map(b=>({label:b.getAttribute('aria-label'),title:b.title,checked:b.getAttribute('aria-checked'),tabIndex:b.tabIndex,width:b.getBoundingClientRect().width,icon:!!b.querySelector('svg')}))};
  },
  async reloadSaved(){fixturePlugin.data=normalizeData(fixtureSaved);fixtureView.render();await fixtureWait();return this.measure();},
  savedNames(){return fixtureSaved?.settings.showSpaceNames;},
  async mountLong({width=293,notes=24}={}){
    await this.mount({width});
    const folder=new TFolder();Object.assign(folder,{path:'04_个人',name:'04_个人',children:[]});fixtureFiles.set(folder.path,folder);
    const nested=new TFolder();Object.assign(nested,{path:'04_个人/健康',name:'健康',children:[]});fixtureFiles.set(nested.path,nested);folder.children.push(nested);
    for(let i=0;i<notes;i++){
      const name=`笔记 ${String(i+1).padStart(2,'0')}`;
      const file=new TFile();Object.assign(file,{path:`${nested.path}/${name}.md`,name:`${name}.md`,basename:name,extension:'md'});
      fixtureFiles.set(file.path,file);nested.children.push(file);
    }
    fixturePlugin.activeSpace.buckets[1].entries=[{id:'scroll-folder',type:'folder',path:folder.path,expanded:true,expandedPaths:[nested.path]}];
    fixtureView.render();this.view=fixtureView;this.plugin=fixturePlugin;
    await fixtureWait();
  },
  files:fixtureFiles,
  async mountIcons(){
    this.icons?.stop();this.enhancer?.stop();
    await this.mount();
    for(const path of ['项目','项目/子目录','另一组']){const folder=new TFolder();Object.assign(folder,{path,name:path.split('/').pop(),children:[]});fixtureFiles.set(path,folder);}
    for(const path of ['项目/相同.md','项目/子目录/子笔记.md','另一组/相同.md']){const file=new TFile();Object.assign(file,{path,name:path.split('/').pop(),basename:path.split('/').pop().slice(0,-3),extension:'md'});fixtureFiles.set(path,file);}
    fixtureFiles.get('项目').children=[fixtureFiles.get('项目/子目录'),fixtureFiles.get('项目/相同.md')];
    fixtureFiles.get('项目/子目录').children=[fixtureFiles.get('项目/子目录/子笔记.md')];
    fixturePlugin.activeSpace.pinnedEntries.push({id:'pinfolder',type:'folder',path:'项目',expanded:true,expandedPaths:['项目/子目录']});
    fixturePlugin.activeSpace.buckets[0].entries.push({id:'folder',type:'folder',path:'项目',expanded:false},{id:'duplicate',type:'file',path:'另一组/相同.md'});
    fixtureView.render();
    this.settings=normalizeFileIconSettings();
    this.app=fixtureApp;this.plugin=fixturePlugin;this.view=fixtureView;
    const native=document.querySelector('#native');native.replaceChildren();
    for(const row of document.querySelectorAll('.bucket-entry-row')){
      const folder=row.dataset.bucketKind==='folder',expanded=row.querySelector('.bucket-disclosure')?.getAttribute('aria-expanded')==='true';
      const wrapper=document.createElement('div');wrapper.className=folder?`nav-folder ${expanded?'':'is-collapsed'}`:'nav-file';
      const n=document.createElement('div');n.className=folder?'nav-folder-title':'nav-file-title';n.dataset.path=row.dataset.bucketPath;
      if(folder){const arrow=document.createElement('div');arrow.className='nav-folder-collapse-indicator collapse-icon';setIcon(arrow,'chevron-right');n.append(arrow);}
      const label=document.createElement('div');label.className=folder?'nav-folder-title-content':'nav-file-title-content';label.textContent=row.dataset.bucketPath;n.append(label);wrapper.append(n);native.append(wrapper);
    }
    this.nativeLeaf={view:{containerEl:native,getViewType:()=> 'file-explorer'}};
    this.icons=new FileIconManager(fixtureApp,()=>this.settings);this.icons.start();
    this.enhancer=new NativeFileExplorerEnhancer(fixtureApp,this.icons);this.enhancer.start();
    await fixtureWait();return this.identities();
  },
  refreshIcons(){this.icons.refresh();this.enhancer.refresh();},
  async mountPdf(){
    await this.mountIcons();
    for(const p of ['项目/面试记录.pdf','项目/子目录/简历.PDF','项目/子目录/排除.pdf']){
      const file=Object.assign(new TFile(),{path:p,name:p.split('/').pop(),basename:p.split('/').pop().replace(/\.pdf$/i,''),extension:p.split('.').pop()});
      fixtureFiles.set(p,file);fixtureFiles.get(p.slice(0,p.lastIndexOf('/'))).children.push(file);
    }
    fixturePlugin.activeSpace.pinnedEntries=[{id:'pin-pdf',type:'file',path:'项目/面试记录.pdf'}];
    fixturePlugin.activeSpace.buckets[0].entries=[{id:'pdf-folder',type:'folder',path:'项目',expanded:true,expandedPaths:['项目/子目录'],excludedPaths:['项目/子目录/排除.pdf']}];
    fixturePlugin.activeSpace.buckets[1].entries=[{id:'direct-pdf',type:'file',path:'项目/子目录/简历.PDF'}];
    fixtureView.render();await fixtureWait();
  },
  async mountDelayedIcons(){
    await this.mountIcons();this.icons.stop();this.enhancer.stop();
    // Core can finish restoring a sidebar view after the initial layout pass.
    // Do not synthesize another layout/active-file event to conceal this race.
    const realView=fixtureLeaf.view;
    fixtureLeaf.view={containerEl:document.querySelector('#pane'),getViewType:()=> 'empty'};
    realView.contentEl.replaceChildren();this.icons.start();
    await fixtureWait();fixtureLeaf.view=realView;await realView.onOpen();
    await new Promise(r=>setTimeout(r,180));return this.identities();
  },
  identities(){
    const read=(row,path)=>{const svg=row.querySelector('.ncl-file-identity-glyph');return {path,icon:svg?.dataset.nclIcon,color:svg?getComputedStyle(svg.parentElement).color:null,paint:svg?.dataset.nclIconPaint,count:row.querySelectorAll('.ncl-file-identity-glyph').length};};
    return {bucket:[...document.querySelectorAll('.bucket-entry-row')].map(r=>read(r,r.dataset.bucketPath)),native:[...document.querySelectorAll('#native .nav-file-title,#native .nav-folder-title')].map(r=>read(r,r.dataset.path))};
  },
};
document.body.dataset.ready='true';
