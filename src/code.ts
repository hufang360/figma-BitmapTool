figma.showUI(__html__)
figma.ui.resize(240,490)

// 更新显示选中个数
figma.on('selectionchange', () => {
  showSelection()
})


// 处理消息
figma.ui.onmessage = async (msg) => {
  let args = msg.length>1 ? msg[1] : []
  switch (msg[0]) {
    default: console.log("消息："+args); break

    case "imdata":  addComponent(args); break
    case "imgRawSize":  imgRawSize(args); break
    case "resizeRect":  resizeRect(args); break
    case "insertSvg": insertSvg(args); break;
    case "nudgeSelection": nudgeSelection(args); break;
    case "showMsg": showMsg(args[0]); break;
    
    
    case "createSlice": createSlice(args);  break
    case "createNineSlice": createNineSlice(args); break;
    case "sliceToGif":  sliceToGif(args); break
    case "btnSliceToPng": sliceToPng();  break
    case "btnGroupSlice":  groupSlice(); break
    case "btnNineConstraints": nineConstraints(); break;
    
    case "btnCornerSmoothing": cornerSmoothing();  break
    case "btnRectBox": getRectBox();  break
    case "btnComponentToFrame": componentToFrame();  break
    case "btnSelectExportable": selectExportable();  break
    case "btnSelectText": selectText();  break

    
    

    
    case "reset": count = 0; break
    case "init":
      await figma.loadFontAsync(zhStyle)
      await figma.loadFontAsync(enStyle)
      await figma.loadFontAsync(defaultStyle)
      showSelection()
      break

    break
  }
}


// --------------------
// 显示选中项
function showSelection(){
  const msg = "已选中：" +figma.currentPage.selection.length + " 个"
  figma.ui.postMessage(["showMsg", [msg] ])
  showImageSize()
}

// 显示图片的原尺寸
function showImageSize(){
  let arr = figma.currentPage.selection
  if (arr.length!=1)
    return
  let rect = arr[0] as RectangleNode
  try{
    if(rect.type != "RECTANGLE")
      return
  } catch(err) {
    return
  }
  let fill
  try{ fill = rect.fills[0] as Paint }
  catch(err) {}
  if (fill == undefined){ return }
  if (fill.type != "IMAGE"){ return }

  const image = figma.getImageByHash(fill.imageHash)
  image.getBytesAsync().then(
    (res) => { figma.ui.postMessage(["showImageSize", [res, rect.name, fill.imageHash] ]) },// 成功
    (err) => { console.log(err) } // 失败
  )
  
}


// 添加组件
var count = 0;
// let zhStyle = {family: "Alibaba PuHuiTi", style: "Medium"}
let zhStyle = {family: "Source Han Sans SC", style: "Medium"}
let enStyle = {family: "Andy", style: "Bold"}
let defaultStyle = { family: "Roboto", style: "Regular" }
let colorZhStyle = {type: "SOLID", visible: true, opacity: 1, blendMode: "NORMAL", color: {r: 1, g: 1, b: 1}} as Paint
let colorEnStyle = {type: "SOLID", visible: true, opacity: 0.5, blendMode: "NORMAL", color: {r: 1, g: 1, b: 1}} as Paint
let noBgStyle = {type: "SOLID", visible: false, opacity: 1, blendMode: "NORMAL", color: {r: 1, g: 1, b: 1}} as Paint
async function addComponent(myArgs) {
  let im: Iterable<number> = myArgs[0]
  let itemID: string = myArgs[1]
  let enName: string = myArgs[2]
  let zhName: string = myArgs[3]
  let orderNum: number = myArgs[4]

  console.log(itemID, enName, zhName)
  let imName = itemID + "_" + zhName

  let frame = figma.createComponent()
  frame.clipsContent = false
  frame.resize(120, 120)
  frame.name = imName
  frame.backgrounds = [noBgStyle]

  let image = figma.createImage( new Uint8Array(im) )
  let imageHash = image.hash
  const rect = figma.createRectangle()
  rect.resize(88,88)
  rect.name = itemID.toString()
  rect.fills = [{type: "IMAGE", scaleMode: "FIT", imageHash},]
  rect.x = (120-88)/2
  rect.y = (120-88)/2

  let txt = figma.createText()
  txt.textAlignHorizontal = "CENTER"
  txt.textAlignVertical = "TOP"
  txt.textAutoResize = "NONE"
  txt.textCase = "ORIGINAL"
  txt.textDecoration = "NONE"

  txt.characters = zhName
  txt.resize(360, 60)
  txt.x = (120-360)/2
  txt.y = 120

  let total = txt.characters.length
  let zhLen = zhName.length
  txt.fontName = zhStyle
  txt.fontSize = 36

  txt.setRangeFontSize(0,total, 28)
  txt.setRangeFontName(0,zhLen, zhStyle)
  txt.setRangeFills(0,zhLen, [colorZhStyle])

  frame.appendChild(rect)
  frame.appendChild(txt)

  frame.x = (orderNum%10) * 180
  frame.y = (Math.floor(orderNum/10)) * 180

  count ++;
}

// 原图大小
function imgRawSize(myArgs){
  let scaleRate: Number = myArgs[0]
  let needAlign: Boolean = myArgs[1]
  if (figma.currentPage.selection.length == 0){ showMsg("请先选中带图片填充的元素"); return; }

  let error = ""
  for(var i=0;i<figma.currentPage.selection.length; i++){
    let node = figma.currentPage.selection[i]
    
    let rect
    switch (node.type) {
      // 矩形、椭圆、星形、多边形
      case "RECTANGLE":
      case "ELLIPSE":
      case "POLYGON":
      case "STAR":
        rect = node
        break;
      
      // 组件、画板、组
      case "COMPONENT":
      case "FRAME":
      case "GROUP":
        // 查找矩形对象，只处理找到的第一个
        for (const node2 of node.children) {
          if (node2.type == "RECTANGLE"){
            rect = node2
            break
          }
        }
        break
      
      // 组件实例
      case "INSTANCE":
        error += "实例(Instance)内的元素不支持调大小, 未处理:"+ node.name
        continue;
      default:
        error += "未处理:"+ node.name
        continue;
    }

    if (!rect)
      return

    let fill
    try{ fill = rect.fills[0] as Paint }
    catch(err) {}
    if (fill == undefined){ error += "\n"+rect.name+" 里没有填充👐"; continue; }
    if (fill.type != "IMAGE"){ error += "\n"+rect.name+" 的填充里没有图像👐"; continue; }

    const image = figma.getImageByHash(fill.imageHash)
    image.getBytesAsync().then(
      (res) => { figma.ui.postMessage(["imgRawSize", [rect.id, res, scaleRate, needAlign, error] ]) },// 成功
      (err) => { console.log(err) } // 失败
    )
  }
  postMsg("showMsg",[error])
}

// 重设 rect大小
function resizeRect(myArgs){
  let rectID: string = myArgs[0]
  let w: number = myArgs[1]
  let h: number = myArgs[2]
  let needAlign: Boolean = myArgs[3]
  if (!rectID)
    return
  
  const rect = figma.getNodeById(rectID) as RectangleNode
  rect.resize(w, h)

  // 居中对齐
  if (needAlign && rect.parent ){
    if ( rect.parent.type =="GROUP" ){
      let p = rect.parent as GroupNode
      rect.x = p.x + (p.width-w)/2
      rect.y = p.y + (p.height-h)/2

    } else {
      let p = rect.parent as FrameNode
      rect.x = (p.width-w)/2
      rect.y = (p.height-h)/2
    }
  }

    // 居中显示对象
    // figma.viewport.scrollAndZoomIntoView([rect])
}

// 位移所选
function nudgeSelection(myArgs){
  let pad = parseFloat(myArgs[0])
  let op = myArgs[1]

  for (const node of figma.currentPage.selection) {
    switch (op) {
      case "up":
        node.y -= pad;
        break;
      case "down":
        node.y += pad;
        break;
      case "left":
        node.x -= pad;
        break;
      case "right":
        node.x += pad;
        break;
    
      default:
        break;
    }
  }

}

// 生成切片
function createSlice(myArgs){
  let row = myArgs[0]
  let col = myArgs[1]
  if (figma.currentPage.selection.length == 0){ showMsg("请先选中元素",1000); return; }

  const rect = figma.currentPage.selection[0] as RectangleNode

  // 对象不在组或frame中时，切片会以画布背景（灰色）作为背景色，打组处理，以便让背景变得透明
  let parentNode = rect.parent
  if (parentNode.type == "PAGE"){
    figma.group([rect], parentNode)
    rect.parent.name = rect.name
  }

  let index = findNodeIndex(rect)
  let oneW = rect.width/col
  let oneH = rect.height/row
  let total = row * col

  let slice:BaseNode
  let slices = []
  for(var i=0; i<total; i++){
    slice = figma.createSlice()
    slice.resize(oneW, oneH)
    slice.exportSettings = [{format: "PNG", suffix: "", contentsOnly: true, constraint: {type: "SCALE", value: 1}}]
    slice.x = rect.x + (i%col * oneW)
    slice.y = rect.y + (Math.floor(i/col) * oneH)
    if( total == 1 )
      slice.name = rect.name
    else
      slice.name = rect.name + " / " + prefixZero(i+1,3)

    rect.parent.insertChild(index+1, slice)
    slices.push(slice)
  }

  // 选中切片
  if( slices.length )
    figma.currentPage.selection = slices
}

// 九切片
function createNineSlice(myArgs){
  if (figma.currentPage.selection.length == 0){ showMsg("请先选中元素",1000); return; }

  const rect = figma.currentPage.selection[0] as RectangleNode;

  // 对象不在组或frame中时，切片会以画布背景（灰色）作为背景色，打组处理，以便让背景变得透明
  let parentNode = rect.parent;
  if (parentNode.type == "PAGE"){
    figma.group([rect], parentNode);
    rect.parent.name = rect.name;
  }

  let index = findNodeIndex(rect)

  let top = myArgs[0];
  let bottom = myArgs[1];
  let left = myArgs[2];
  let right = myArgs[3];

  let x = 0;
  let y = 0;
  let w = 8;
  let h = 8;
  
  let slice:BaseNode;
  let slices = []
  for(var i=0; i<0; i++){
    if (i == 0) {
        x = 0;
        y = 0;
        w = left;
        h = top;
    } else if (i == 1) {
        x = left;
        y = 0;
        w = rect.width - left - right;
        h = top;
    } else if (i == 2) {
        x = rect.width - right;
        y = 0;
        w = right;
        h = top;
    }
    
    else if (i == 3) {
        x = 0;
        y = top;
        w = left;
        h = rect.height - top - bottom;
    } else if (i == 4) {
        x = left;
        y = top;
        w = rect.width - left - right;
        h = rect.height - top - bottom;
    } else if (i == 5) {
        x = rect.width - right;
        y = top;
        w = right;
        h = rect.height - top - bottom;
    }
    
    else if (i == 6) {
        x = 0;
        y = rect.height - bottom;
        w = left;
        h = bottom;
    } else if (i == 7) {
        x = left;
        y = rect.height - bottom;
        w = rect.width - left - right;
        h = bottom;
    } else if (i == 8) {
        x = rect.width - right;
        y = rect.height - bottom;
        w = right;
        h = bottom;
    }

    slice = figma.createSlice();
    slice.resize(w, h);
    slice.exportSettings = [{format: "PNG", suffix: "", contentsOnly: true, constraint: {type: "SCALE", value: 1}}]
    slice.x = rect.x + x;
    slice.y = rect.y + y;
    slice.name = prefixZero(i+1,2).toString();
    rect.parent.insertChild(index+1, slice);
    slices.push(slice);
  }

  let rect2:VectorNode = figma.createVector();
  rect2.resize(w,h);
  rect2.cornerSmoothing = 1;
  rect2.fills = [];
  rect2.dashPattern = [0,1]
  rect2.strokeAlign = "CENTER";
  rect2.strokeCap = "ROUND";
  rect2.strokeJoin = "ROUND";
  rect2.strokeMiterLimit = 4;
  rect2.strokeWeight = 0.5;
  rect2.strokes = [{type: "SOLID", visible: true, opacity: 1, blendMode: "NORMAL", color: {r: 1, g: 0.33725491166114807, b: 0.26274511218070984}}];
  rect2.vectorNetwork = getNineVector(rect.width,rect.height, top, bottom, left, right);
  rect2.x = rect.x;
  rect2.y = rect.y;
  rect2.name = "[BitmapTool]9SlicePreview";
  rect.parent.insertChild(index+1, rect2);

  // 选中切片
  if( slices.length )
    figma.currentPage.selection = slices
}
function getNineVector(width, height, up, bottom, left, right){
  let v:VectorRegion = {windingRule: "NONZERO", loops: [[ 0, 1, 8, 9, 2, 3, 6, 7 ]]};
  return {
      vertices: [
          getVectorVertex(0, 0),
          getVectorVertex(width, 0),
          getVectorVertex(width, height),
          getVectorVertex(0, height),
          getVectorVertex(left, 0),
          getVectorVertex(left, height),
          getVectorVertex(width-right, 0),
          getVectorVertex(width-right, height),
          getVectorVertex(0, up),
          getVectorVertex(width, up),
          getVectorVertex(0, height-bottom),
          getVectorVertex(width, height-bottom)
      ],
      segments: [
          getVectorSegments(0, 4),
          getVectorSegments(4, 1),
          getVectorSegments(2, 5),
          getVectorSegments(5, 3),
          getVectorSegments(4, 5),
          getVectorSegments(6, 7),
          getVectorSegments(3, 8),
          getVectorSegments(8, 0),
          getVectorSegments(1, 9),
          getVectorSegments(9, 2),
          getVectorSegments(8, 9),
          getVectorSegments(10, 11)
      ],
      regions: [v]
    }
}
function getVectorVertex(x=0, y=0){
  let v:VectorVertex = { x: x, y: y, strokeCap: "ROUND", strokeJoin: "ROUND", cornerRadius: 0, handleMirroring: "NONE" };
  return v;
}
function getVectorSegments(start=0, end=11){
  let v:VectorSegment = { start: start, end: end, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } };
  return v;
}

// 组内切片
function groupSlice(){
  if (figma.currentPage.selection.length == 0){ showMsg("请先选中组元素",1000); return; }

  let hasChange = false
  for (const node of figma.currentPage.selection) {
    if(node.type != "GROUP" || node.parent == null)
      continue

    // 将组设置为可导出
    node.exportSettings = [{format: "PNG", suffix: "", contentsOnly: true, constraint: {type: "SCALE", value: 1}}]
    hasChange = true

    // 如果父对象是frame
    const frameNode = node.parent as BaseNode
    if(frameNode.type != "FRAME")
      continue

    // 已创建时则跳过
    let needCreate = true
    let w = frameNode.width
    let h = frameNode.height
    for ( const node2 of node.children){
      if( node2.type == "RECTANGLE" && node2.name == "bg" && node2.width==w && node2.height==h){
        needCreate = false
        break
      }
    }
    // 创建
    if(needCreate){
      // 获取frame的背景色
      // {type: "SOLID", visible: true, opacity: 1, blendMode: "NORMAL", color: {r: 0.37254902720451355, g: 0.6313725709915161, b: 0.9058823585510254}}
      let color = {r: 1, g: 1, b: 1}
      let solidPaint = frameNode.backgrounds.length ? frameNode.backgrounds[0] as SolidPaint : undefined
      if( solidPaint && solidPaint.type == 'SOLID')
        color = solidPaint.color

      let bgNode:BaseNode = figma.createRectangle()
      bgNode.resize(w, h)
      bgNode.name = "bg"
      bgNode.fills = [{type: "SOLID", visible: false, opacity: 1, blendMode: "NORMAL", color:color}]
      bgNode.cornerSmoothing=1

      node.insertChild(0, bgNode)
    }
  }

  if (!hasChange)
    showMsg("未做任何处理，请选中一个或多个组")
}

// 导出可导项
function selectExportable(){
  if (figma.currentPage.selection.length == 0){ showMsg("请先选中元素",1000); return; }

  let m_nodes = [];
  let filters = ['COMPONENT', 'INSTANCE', 'COMPONENT_SET'];
  for(const node of figma.currentPage.selection){
    findChild(node);
  }
  
  function findChild(node: SceneNode){
    if (node.exportSettings.length)
      m_nodes.push(node);
    
    if (filters.indexOf(String(node.type)) !=-1 )
      return
    
    if ('children' in node) {
      for (const child of node.children) {
        findChild(child);
      }
    }
  }

  // 选中这些
  figma.currentPage.selection = m_nodes;
}

// 选中文本框
function selectText(){
  if (figma.currentPage.selection.length == 0){ showMsg("请先选中元素",1000); return; }

  let m_nodes = [];
  for(const node of figma.currentPage.selection){
    findChild(node);
  }
  
  function findChild(node: SceneNode){
    if (node.type == 'TEXT')
      m_nodes.push(node);
    
    if ('children' in node) {
      for (const child of node.children) {
        findChild(child);
      }
    }
  }

  // 选中这些
  figma.currentPage.selection = m_nodes;
}

function nineConstraints(){
  if (figma.currentPage.selection.length!=9){ showMsg("请先选中9张图片",1000); return; }
  let arr = []
  for (var i=0; i<9; i++){
    arr.push( prefixZero(i+1,2))
  }
  for(var node of figma.currentPage.selection)
  {
    if( arr.indexOf( node.name ) ==-1 ){
      showMsg("选中的9张图片，名字应该是 01、02、03...09（数字序号为 从左往右 自上而下）",2000);
      return;
    }
  }

  // Constraints
  // https://www.figma.com/plugin-docs/api/Constraints/
  let total = figma.currentPage.selection.length;
  for(var i=0; i<total; i++){
  {
    let node = figma.currentPage.selection[i] as RectangleNode;
    let s = node.name;

    if(s =="01"){
      // left
      // top
      node.constraints = {horizontal: "MIN", vertical:"MIN"};
    }
    else if(s =="02"){
      // left and right
      // top
      node.constraints = {horizontal: "STRETCH", vertical: "MIN"};
    }
    else if(s =="03"){
      // right
      // top
      node.constraints = {horizontal: "MAX", vertical: "MIN"};
    }
    else if(s =="04"){
      // left
      // top and bottom
      node.constraints = {horizontal: "MIN", vertical: "STRETCH"};
    }
    else if(s =="05"){
      // left and right
      // top and bottom
      node.constraints = {horizontal: "STRETCH", vertical: "STRETCH"};
    }
    else if(s =="06"){
      // right
      // top and bottom
      node.constraints = {horizontal: "MAX", vertical: "STRETCH"};
    }
    else if(s =="07"){
      // left
      // bottom
      node.constraints = {horizontal: "MIN", vertical: "MAX"};
    }
    else if(s =="08"){
      // left and right
      // bottom
      node.constraints = {horizontal: "STRETCH", vertical: "MAX"};
    }
    else if(s =="09"){
      // right
      // bottom
      node.constraints = {horizontal: "MAX", vertical: "MAX"};
    }

    
    
    // let paint = JSON.parse(JSON.stringify({type: "IMAGE", visible: true, opacity: 1, blendMode: "NORMAL", scaleMode: "TILE"}));
    // paint.imageHash = node.fills[0].imageHash;
    // node.fills[0] = paint;
    const fills = cloneFills(node.fills)
    fills[0].scaleMode = "TILE";
    node.fills = fills;

    }
  }

}

function cloneFills(val) {
  return JSON.parse(JSON.stringify(val))
}


// 平滑圆角
function cornerSmoothing(){
  let arr = figma.currentPage.selection
  if (arr.length == 0){ showMsg("请先选中元素",1000); return; }
  for(var i=0;i<arr.length; i++){
    let node = arr[i] as BaseNode
    if (node.type == "RECTANGLE"){
      node.cornerSmoothing=1
      node.cornerRadius = 5
    }
  }
  showMsg("已添加 5px 平滑圆角",1000)
}


// 获取位置信息
function getRectBox(){
  if (figma.currentPage.selection.length==0){ showMsg("请先选中元素",1000); return; }

  let s=''
  for(var node of figma.currentPage.selection)
  {
    node = node as RectangleNode
    s += '\n{\n'
    s += '\t"name": "' + node.name + '",\n'
    s += '\t"x": ' + node.x + ',\n'
    s += '\t"y": ' + node.y + ',\n'
    s += '\t"w": ' + node.width + ',\n'
    if (node.rotation ==-180){
      s += '\t"h": ' + node.height + ',\n'
      s += '\t"hflip": "1"\n'
    }else{
      s += '\t"h": ' + node.height + '\n'
    }
    s += '},'
  }
  s = '['+s.substr(0, s.length-1)+'\n]'
  // 拷贝到剪贴板
  copyToClipboard(s)
  // showMsg("已输出到 ID清单输入框中，按（⌘+A，⌘+C）进行拷贝")
  // showMsg("已输出至控制台（⌘+⌥+i）")
  // console.log(s)
}

// componentToFrame
function componentToFrame(){
  for (const node of figma.currentPage.selection) {
    if(node.type != "COMPONENT")
      continue

    let frame = figma.createFrame()
    frame.resize(node.width, node.height)
    frame.x = node.x
    frame.y = node.y
    frame.rotation = node.rotation
    frame.name = node.name
    frame.opacity = node.opacity
    frame.blendMode = node.blendMode
    frame.clipsContent = node.clipsContent
    frame.itemSpacing = node.itemSpacing
    frame.primaryAxisSizingMode = node.primaryAxisSizingMode
    frame.counterAxisSizingMode = node.counterAxisSizingMode
    frame.primaryAxisAlignItems = node.primaryAxisAlignItems
    frame.counterAxisAlignItems = node.counterAxisAlignItems
    frame.paddingLeft = node.paddingLeft
    frame.paddingRight = node.paddingRight
    frame.paddingTop = node.paddingTop
    frame.paddingBottom = node.paddingBottom
    frame.itemSpacing = node.itemSpacing

    frame.cornerRadius = node.cornerRadius
    frame.cornerSmoothing = node.cornerSmoothing
    frame.topLeftRadius = node.topLeftRadius
    frame.topRightRadius = node.topRightRadius
    frame.bottomLeftRadius = node.bottomLeftRadius
    frame.bottomRightRadius = node.bottomRightRadius

    frame.strokes = [].concat(node.strokes)
    frame.strokeWeight = node.strokeWeight
    frame.strokeMiterLimit = node.strokeMiterLimit
    frame.strokeAlign = node.strokeAlign
    frame.strokeCap = node.strokeCap
    frame.strokeJoin = node.strokeJoin
    frame.dashPattern = [].concat(node.dashPattern)
    frame.strokeStyleId = node.strokeStyleId
    // frame.outlineStroke = node.outlineStroke

    frame.fills = [].concat(node.fills)
    frame.fillStyleId = node.fillStyleId

    frame.guides = [].concat(node.guides)
    frame.exportSettings = [].concat(node.exportSettings)
    frame.effects = [].concat(node.effects)
    frame.effectStyleId = node.effectStyleId

    frame.constrainProportions = node.constrainProportions
    frame.layoutAlign = node.layoutAlign
    frame.layoutGrow = node.layoutGrow
    frame.layoutMode = node.layoutMode
    frame.layoutGrids = [].concat(node.layoutGrids)

    for( const nodeSub of node.children){
      frame.appendChild(nodeSub)
    }

    // 层级仅在component上面的一个层级
    let index = findNodeIndex(node)
    node.parent.insertChild(index+1, frame)
    frame.expanded = false

    node.visible = false
  }
}

// 切片转png
function sliceToPng(){
  const newSelection = []
  for (const node of figma.currentPage.selection) {
    node.exportAsync({format: "PNG", suffix: "", contentsOnly: true, constraint: {type: "SCALE", value: 1}}).then(
      (res) => {
        // console.log(res)

        const paint = JSON.parse(JSON.stringify({type: "IMAGE", visible: true, opacity: 1, blendMode: "NORMAL", scaleMode: "FILL"}));
        paint.imageHash = figma.createImage(res).hash;

        const rect = figma.createRectangle();
        rect.resize(node.width, node.height);
        rect.fills = [paint];
        rect.x = node.x;
        rect.y = node.y;
        rect.name = node.name;

        node.parent.insertChild( findNodeIndex(node)+1, rect);

        newSelection.push(rect);
        figma.currentPage.selection = newSelection;
      },// 成功
      (err) => { console.log(err) } // 失败
    )
  }
}

// sliceToGif
function sliceToGif(myArgs){
  if (figma.currentPage.selection.length == 0){ showMsg("请先选中切片",1000); return; }
  
  let delay = myArgs[0]
  let total = figma.currentPage.selection.length
  for (let i=0;i<total; i++) {
    const rect = figma.currentPage.selection[i] as RectangleNode
    let index = rect.name.lastIndexOf("/")
    let gifName = rect.name
    if (index!=-1){
      gifName = rect.name.substring(0,Math.max(1,index-1))
    }
    gifName = gifName.replace("/","").replace("\\","")

    rect.exportAsync({format: "PNG", suffix: "", contentsOnly: true, constraint: {type: "SCALE", value: 1}}).then(
      (res) => { postMsg("sliceToGif", [res,i,total, gifName, delay]) },// 成功
      (err) => { console.log(err) } // 失败
    )
  }
}

// 插入svg
function insertSvg(myArgs){
  var svgString = myArgs[0]
  var svgNotes = myArgs[1]
  var frameNum = myArgs[2]

  var node = figma.createNodeFromSvg(svgString)

  let col = 10
  let oneW = node.width
  let oneH = node.height
  node.x = frameNum%col * oneW
  node.y = Math.floor(frameNum/col) * oneH
  node.name = svgNotes + " / " + prefixZero(frameNum+1,3)
}


// post消息给html
function postMsg(msgName: string, arr=[]){
  figma.ui.postMessage([msgName, arr])
}

// 拷贝到剪贴板
function copyToClipboard(msg: string){
  postMsg("copyText", [msg])
}


// --------------------
// 通用方法
// --------------------

// 查找节点的图层索引值
function findNodeIndex(myNode:BaseNode){
  const arr = myNode.parent.children
  for(var i=0;i<arr.length; i++){
    if(arr[i].id === myNode.id)
      return i
  }
  return -1
}

// totast 提示
let prehandler:NotificationHandler
function showMsg(msg: string, timeout=4000) {
  if(!msg)
    return
  if (prehandler)
    prehandler.cancel()
  prehandler = figma.notify(String(msg), {timeout:timeout} as NotificationOptions)
}

function showUIMsg(msg: string){
  postMsg("showMsg",[msg])
}

// 补0
function prefixZero(num: string | number, n: number) { return (Array(n).join('0') + num).slice(-n); }