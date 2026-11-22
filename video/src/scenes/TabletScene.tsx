import type {ReactNode} from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';

export type TabletSceneProps = {
  act:string; eyebrow?:string; title:ReactNode; description?:string; bullets?:string[];
  screenshot:string; grade?:'A'|'B'|'C'|'override'; scan?:boolean; duration?:number; children?:ReactNode;
};

export const TabletScene = ({act,eyebrow,title,description,bullets=[],screenshot,grade,scan=false,duration=360,children}:TabletSceneProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame,fps,config:{damping:200},durationInFrames:38});
  const progress = interpolate(frame,[0,duration],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const color = grade ? theme[grade] : theme.cobalt;
  return <AbsoluteFill style={{background:theme.frost,color:theme.ocean,fontFamily:theme.sans,overflow:'hidden'}}>
    <AbsoluteFill style={{background:`radial-gradient(ellipse at 78% 55%, ${color}30 0%, ${color}0A 35%, transparent 66%)`}}/>
    <div style={{position:'absolute',left:90,top:65,right:90,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <div style={{display:'flex',alignItems:'center',gap:14}}><Img src={staticFile('assets/applogo.svg')} style={{width:42,height:42,objectFit:'contain',borderRadius:9}}/><span style={{fontWeight:700,fontSize:25}}>TunaEye</span></div>
      <div style={{fontFamily:theme.body,fontSize:18,letterSpacing:3,color:theme.deep}}>{act}</div>
    </div>
    <div style={{position:'absolute',left:90,top:247,width:555,opacity:enter,transform:`translateY(${(1-enter)*25}px)`}}>
      <div style={{color:grade==='B'?'#946600':color,fontFamily:theme.body,fontSize:17,fontWeight:600,letterSpacing:2.8,marginBottom:30}}>{eyebrow}</div>
      <div data-video-title style={{fontSize:69,lineHeight:1.07,fontWeight:700,letterSpacing:-3,maxWidth:555}}>{title}</div>
      {description && <div style={{fontFamily:theme.body,fontSize:27,lineHeight:1.5,color:'#52647C',marginTop:27,maxWidth:520}}>{description}</div>}
      <div style={{marginTop:34,display:'flex',flexDirection:'column',gap:19}}>
        {bullets.map((bullet,i) => {
          const reveal=spring({frame:frame-24-i*12,fps,config:{damping:200},durationInFrames:30});
          return <div key={bullet} style={{display:'flex',gap:14,alignItems:'flex-start',fontFamily:theme.body,fontSize:22,lineHeight:1.45,opacity:reveal,transform:`translateX(${(1-reveal)*20}px)`}}><span style={{marginTop:9,minWidth:8,height:8,borderRadius:'50%',background:color}}/>{bullet}</div>;
        })}
      </div>
      {children}
    </div>
    <div style={{position:'absolute',left:727,top:195,width:1090,transform:`perspective(2200px) rotateY(${-4+progress*3}deg) rotateX(1deg) scale(${(.96+progress*.06)*(.97+enter*.03)})`,transformOrigin:'center center'}}>
      <div style={{position:'absolute',inset:'15% 5% -4%',background:color,opacity:.12,filter:'blur(65px)',borderRadius:'50%'}}/>
      <div style={{position:'relative',padding:18,borderRadius:37,background:'linear-gradient(135deg,#374151,#090D16 30%,#253550)',border:'2px solid #6B7C9655',boxShadow:'0 32px 65px #0F172A35, inset 0 0 0 2px #FFFFFF18'}}>
        <div style={{position:'absolute',left:'50%',top:6,width:6,height:6,background:'#5C718A',borderRadius:'50%'}}/>
        <div style={{borderRadius:20,overflow:'hidden',position:'relative',aspectRatio:'1280/864',background:'#E9F0FA'}}>
          <Img src={staticFile(`kiosk-screens/${screenshot}`)} style={{width:'100%',height:'100%',objectFit:'contain',display:'block'}}/>
          {['01-welcome.png','01b-welcome-sync-modal.png'].includes(screenshot) && <div style={{position:'absolute',left:'5%',right:'5%',bottom:'8%',height:'7%',borderRadius:22,background:'#0F172AEF',color:'#D7E7FC',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:theme.body,fontSize:15,letterSpacing:.8}}>WEIGHT → SASHIBO CORE → TAIL-CUT IF NEEDED → RECEIPT</div>}
          {scan && <div style={{position:'absolute',left:'3%',right:'3%',top:`${8+(frame%120)/120*84}%`,height:3,background:theme.scan,boxShadow:`0 0 18px 5px ${theme.scan}99`,opacity:interpolate(frame%120,[0,12,108,119],[0,.95,.95,0])}}/>}
        </div>
      </div>
    </div>
    <div style={{position:'absolute',left:90,right:90,bottom:60,height:1,background:'#103B701B'}}/>
    <div style={{position:'absolute',left:90,bottom:28,fontFamily:theme.body,fontSize:14,letterSpacing:2,color:'#718197'}}>PRODUCT WALKTHROUGH · ILLUSTRATIVE DEMO</div>
    <div style={{position:'absolute',right:90,bottom:28,fontFamily:theme.body,fontSize:14,color:'#718197'}}>SEA BEYOND THE CUT.</div>
  </AbsoluteFill>;
};
