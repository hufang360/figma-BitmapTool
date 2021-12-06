// import './ui.css'
// import './lib/figma-plugin-ds.css'
import GifHelper from './utils'
import lottie from './lib/lottie'


const m_lottieInput = document.querySelector('#inputLottie') as HTMLInputElement;
const m_lottieContain = document.querySelector('#lottieContain') as HTMLDivElement;


document.getElementById('btnlottie').onclick = () => {
    testLottie();
}

// testLottie()
function testLottie(){
    let anim= lottie.loadAnimation({
        container: m_lottieContain,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: m_lottieInput.value
      });

    let frameNum = 0;
    anim.addEventListener("DOMLoaded", function() {
        let info = "帧率：\t" + anim.frameRate
        + "\n总帧数：\t" + anim.totalFrames
        + "\n当前帧：\t" + anim.currentFrame
        + "\n文件名：\t" + anim.fileName
        + "\ndata-宽度：\t" + anim.animationData.w
        + "\ndata-高度：\t" + anim.animationData.h
        + "\ndata-总帧数：\t" + anim.animationData.op
        + "\ndata-帧率：\t" + anim.animationData.fr
        + "\ndata-版本：\t" + anim.animationData.v
        console.log(info)
        console.log(anim)
        m_lottieContain.style.width = anim.animationData.w
        m_lottieContain.style.height = anim.animationData.h
    });

    anim.addEventListener('enterFrame', function(){
        let s = new XMLSerializer();
        let svgStr = s.serializeToString(anim.renderer.svgElement);
        postMsg('insertSvg',[svgStr, anim.fileName, frameNum])
        frameNum ++
    });
    anim.addEventListener('complete', function(){
        frameNum = 0;
        console.log("complete");
    });
}


// --------------------
function postMsg(msg: string, arr=[]){
    parent.postMessage({ pluginMessage: [msg, arr] }, '*');
}
function showFigMsg(msg: string){ postMsg("showMsg", [msg]); }

// 通知 figma.ui 预加载字体
postMsg("init")

// --------------------
// 处理figma.ui发送过来消息
onmessage = (event) => {
    let msg = event.data.pluginMessage
    let args = msg.length>1 ? msg[1] : []
    switch (msg[0]) {
        case "imgRawSize": imgRawSizeHandle(args);  break;
        case "showImageSize": showImageSize(args);  break;
        case "showMsg": showMsg(String(args[0]));  break;
        case "copyText": copyText(String(args[0]));  break;
        case "sliceToGif": sliceToGifHandle(args);  break;
        default: console.log(msg); break;
    }
}

// --------------------
// 为按钮添加事件
let btnNames = [
    "btnGroupSlice", 
    "btnCornerSmoothing", "btnComponentToFrame",
    "btnSelectExportable", "btnSelectText",
    "btnRectBox"
]
for (let n of btnNames) {
    document.getElementById(n).onclick = () => { parent.postMessage({ pluginMessage: [n, []] }, '*'); }
}

// 面板上的提示文字
let tidMsg = 0
function showMsg(msg: string){
    let ele = document.querySelector('#msgBox') as HTMLDivElement;
    ele.innerHTML = msg;
    let eleParent = document.querySelector('#msgBoxParent') as HTMLDivElement;
    eleParent.style.display = "";
    clearTimeout(tidMsg);
    tidMsg = setTimeout("document.querySelector('#msgBoxParent').style.display='none'",300000);
}

// 生成切片
document.getElementById('btnSlice').onclick = () => {
  let inputRow = document.querySelector('#inputRow') as HTMLInputElement;
  let inputCol = document.querySelector('#inputCol') as HTMLInputElement;
  let row = parseInt(inputRow.value);
  let col = parseInt(inputCol.value);
  if (!row) { row=1; inputRow.value="1"; };
  if (!col) { col=1; inputCol.value="1"; };
  postMsg("createSlice", [row, col]);
}

// // 生成9切片
// document.getElementById('btnNineSlice').onclick = () => {
//     let inputTop = document.querySelector('#inputNineTop') as HTMLInputElement;
//     let inputBottom = document.querySelector('#inputNineBottom') as HTMLInputElement;
//     let inputLeft = document.querySelector('#inputNineLeft') as HTMLInputElement;
//     let inputRight = document.querySelector('#inputNineRight') as HTMLInputElement;
//     let top = parseInt(inputTop.value);
//     let bottom = parseInt(inputBottom.value);
//     let left = parseInt(inputLeft.value);
//     let right = parseInt(inputRight.value);
//     if (!top) { top=8; inputTop.value="8"; };
//     if (!bottom) { bottom=8; inputBottom.value="8"; };
//     if (!left) { left=8; inputLeft.value="8"; };
//     if (!right) { right=8; inputRight.value="8"; };
//     postMsg("createNineSlice", [top, bottom, left, right]);
// }


// 原图大小
document.getElementById('btnImageSize').onclick = () => {
    const m_input = document.querySelector('#imageSize') as HTMLInputElement;
    const cb = document.querySelector('#alignCheckbox') as HTMLInputElement;
    let scaleRate = parseInt(m_input.value);
    if ( !scaleRate )
        scaleRate = 1;
    m_input.value = String(scaleRate);
    postMsg("imgRawSize", [scaleRate, cb.checked]);
}
// 获得带图片填充的node后
function imgRawSizeHandle(myArgs){
    let imID = myArgs[0];
    let imData = myArgs[1];
    let scaleRate = myArgs[2];
    let needAlign = myArgs[3];
    let img = new Image;
    img.src = URL.createObjectURL(new Blob([imData.buffer]));
    img.onload = function(){
        let w = img.width * scaleRate;
        let h = img.height * scaleRate;
        if (imID)
            postMsg("resizeRect", [imID, w, h, needAlign] );
        let msg = scaleRate==1 ? w + "x"+ h : w + "x"+ h + " ("+ img.width + "x"+img.height+  ")";
        showFigMsg(msg);
    }
}

// 显示原图尺寸
function showImageSize(myArgs){
    let imData = myArgs[0]
    let img = new Image;
    let imgBob = new Blob([imData.buffer])
    img.src = URL.createObjectURL(imgBob)
    img.onload = function(){
        let w = img.width
        let h = img.height
        showImgSize("原图: "+w+"x"+h+"px")

        // let m_name = myArgs[1]
        // let ele = document.querySelector('#imgLink') as HTMLAnchorElement
        // ele.href = img.src
        // ele.innerHTML = m_name + ".png"
        // ele.download = m_name + ".png"
        // ele.title = m_name + ".png"
    }
}
let tidImgSize = 0
function showImgSize(msg: string){
    let ele = document.querySelector('#imgSize') as HTMLDivElement;
    ele.innerHTML = msg;
    let eleParent = document.querySelector('#imgSizeParent') as HTMLDivElement;
    eleParent.style.display = "";
    clearTimeout(tidImgSize);
    tidMsg = setTimeout("document.querySelector('#imgSizeParent').style.display='none'",300000);
}

// 输出要复制的文本到textarea中
function copyText(msg) {
    let textarea = document.createElement("textarea") as HTMLTextAreaElement;
    let currentFocus = document.activeElement as HTMLElement;
    let toolBoxwrap = document.getElementById('clipboardBox');
    toolBoxwrap.appendChild(textarea)
    textarea.value = msg
    textarea.focus();
    if (textarea.setSelectionRange) {
        textarea.setSelectionRange(0, textarea.value.length)
    } else {
        textarea.select();
    }
    try {
        var flag = document.execCommand("copy");
    } catch (err) {
        var flag = false;
    }
    toolBoxwrap.removeChild(textarea);
    currentFocus.focus()

    if (flag) {
        showFigMsg("已复制到剪贴板中")
    } else {
        showFigMsg("复制失败")
    }
}


// 偏移所选项
const oInputNudge = document.getElementById('inputNudge') as HTMLInputElement
document.getElementById('btnUp').onclick = () => {
    nudgeSelection(oInputNudge.value, "up")
}
document.getElementById('btnDown').onclick = () => {
    nudgeSelection(oInputNudge.value, "down")
}
document.getElementById('btnLeft').onclick = () => {
    nudgeSelection(oInputNudge.value, "left")
}
document.getElementById('btnRight').onclick = () => {
    nudgeSelection(oInputNudge.value, "right")
}
function nudgeSelection(pad, op:string){
    postMsg('nudgeSelection',[pad, op])
}


// 切片转png
document.getElementById('btnSliceToPng').onclick = () => {
    postMsg("btnSliceToPng")
}



// -------------------- gif end --------------------
// 切片合成gif
let gifFrameNum = 0
let gifFrameData = []
let gifDelays = []
document.getElementById('btnSliceToGif').onclick = () => {
    gifFrameNum = 0
    gifFrameData = []
    gifDelays = []

    document.querySelector('#gifLink').innerHTML = ""
    let img = document.querySelector('#gifImg') as HTMLImageElement
    img.src = ""

    let inputDelay = document.querySelector("#inputDelay") as HTMLInputElement
    let delay = parseInt(inputDelay.value)
    if (!delay) { delay=100; inputDelay.value=String(delay); }

    postMsg("sliceToGif",[delay])
}

// 一张一张地添加图片，所有图片处理完后再生成gif
function sliceToGifHandle(myArgs){
    let imData = myArgs[0]
    let index = myArgs[1]
    let total = myArgs[2]
    let gifName = myArgs[3]
    let delay = myArgs[4]
    let img = new Image;
    img.src = URL.createObjectURL(new Blob([imData.buffer]))
    img.onload = function(){
        gifFrameNum ++
        gifFrameData.push({'index':index, 'img':img })
        gifDelays.push(delay);
        if (gifFrameNum >= total){

        // 排序, 避免异步操作时图片可能不按顺序添加
        let keysSorted = Object.keys(gifFrameData).sort(function(a,b){
            return gifFrameData[b]-gifFrameData[a]
        })
        let newData = []
        let newDelays = []
        for(let key of keysSorted ){
            newData.push( gifFrameData[key] );
            newDelays.push( gifDelays[key] );
        }
        GifHelper.createGif(newData, gifName, newDelays );
        }
    }
}
// -------------------- gif end --------------------
