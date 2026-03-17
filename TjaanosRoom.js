import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db, auth, storage } from './firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function TjaanosRoom() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);

  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [musicFile, setMusicFile] = useState(null);

  const [users, setUsers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const q = query(collection(db,'users'));
    const unsubscribe = onSnapshot(q,snapshot => {
      const allUsers = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      setUsers(allUsers);
      if(user){
        const currentUser = allUsers.find(u=>u.uid===user.uid);
        setFollowing(currentUser?.following||[]);
      }
    });
    return unsubscribe;
  },[user]);

  useEffect(() => {
    const q = query(collection(db,'posts'), orderBy('createdAt','desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const allPosts = snapshot.docs.map(doc=>({id: doc.id, ...doc.data()}));
      setPosts(allPosts);
    });
    return unsubscribe;
  },[]);

  const register = async () => {
    if(!email||!password||!username) return;
    try{
      const userCred = await createUserWithEmailAndPassword(auth,email,password);
      let avatarUrl = null;
      if(avatarFile){
        const avatarRef = ref(storage, `avatars/${userCred.user.uid}`);
        await uploadBytes(avatarRef, avatarFile);
        avatarUrl = await getDownloadURL(avatarRef);
      }
      await addDoc(collection(db,'users'),{
        uid:userCred.user.uid,
        name:username,
        email,
        avatar:avatarUrl,
        xp:0,
        level:1,
        following:[]
      });
      setUser({uid:userCred.user.uid,name:username,avatar:avatarUrl,xp:0,level:1});
    }catch(e){console.log(e)}
  };

  const login = async () => {
    if(!email||!password) return;
    try{
      const userCred = await signInWithEmailAndPassword(auth,email,password);
      const q = query(collection(db,'users'), where('uid','==',userCred.user.uid));
      const unsubscribe = onSnapshot(q,snapshot => {
        if(snapshot.docs[0]){
          setUser(snapshot.docs[0].data());
        }
      });
    }catch(e){console.log(e)}
  };

  const uploadFile = async (file, folder) => {
    if(!file) return null;
    const fileRef = ref(storage, `${folder}/${user.uid}_${Date.now()}`);
    await uploadBytes(fileRef,file);
    return await getDownloadURL(fileRef);
  };

  const addPost = async () => {
    if(!user || (!text&&!imageFile&&!videoFile&&!musicFile)) return;
    const imageUrl = await uploadFile(imageFile,'images');
    const videoUrl = await uploadFile(videoFile,'videos');
    const musicUrl = await uploadFile(musicFile,'music');
    await addDoc(collection(db,'posts'),{
      user:user.name,
      avatar:user.avatar,
      text,
      image:imageUrl||null,
      video:videoUrl||null,
      music:musicUrl||null,
      likes:0,
      comments:[],
      createdAt:new Date()
    });
    setText(''); setImageFile(null); setVideoFile(null); setMusicFile(null);
  };

  const likePost = async (postId) => {
    const postRef = doc(db,'posts',postId);
    const post = posts.find(p=>p.id===postId);
    if(post){
      await updateDoc(postRef,{likes: post.likes+1});
      if(post.user!==user.name){
        setNotifications(prev=>[...prev,`${user.name} liked your post!`]);
      }
      await updateXP(2);
    }
  };

  const addComment = async (postId, comment) => {
    const postRef = doc(db,'posts',postId);
    const post = posts.find(p=>p.id===postId);
    if(post){
      const newComments = [...post.comments, comment];
      await updateDoc(postRef,{comments:newComments});
      if(post.user!==user.name){
        setNotifications(prev=>[...prev,`${user.name} commented on your post!`]);
      }
      await updateXP(3);
    }
  };

  const updateXP = async (amount) => {
    const userRef = doc(db,'users',users.find(u=>u.uid===user.uid).id);
    const newXP = (user.xp||0)+amount;
    const newLevel = Math.floor(newXP/50)+1;
    await updateDoc(userRef,{xp:newXP,level:newLevel});
    setUser(prev=>({...prev,xp:newXP,level:newLevel}));
  };

  const toggleFollow = async (targetUser) => {
    const userRef = doc(db,'users',users.find(u=>u.uid===user.uid).id);
    let updatedFollowing = [...following];
    if(following.includes(targetUser)){
      updatedFollowing = updatedFollowing.filter(u=>u!==targetUser);
    } else {
      updatedFollowing.push(targetUser);
    }
    await updateDoc(userRef,{following:updatedFollowing});
    setFollowing(updatedFollowing);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl text-red-500 font-bold">Tjaano's Room (Live)</h1>
      {/* Registration/Login UI */}
      {/* Notifications */}
      {/* Leaderboard */}
      {/* Follow/Search */}
      {/* Post creation */}
      {/* Posts Feed */}
      {/* Fully connected to Firebase */}
    </div>
  );
}
