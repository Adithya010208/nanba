import {useMediaUrl} from '../../features/media/media'
export function ProfileAvatar({path,name,className}:{path:string|null|undefined;name:string;className?:string}){const{url}=useMediaUrl(path||null);return<span className={`avatar ${className||''}`}>{path&&url?<img src={url} alt={`${name}’s avatar`}/>:name.slice(0,1).toUpperCase()}</span>}
