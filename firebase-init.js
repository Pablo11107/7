// firebase-init.js
// Módulo compartido por todas las páginas de FOCUS.
// Aquí vive la configuración de Firebase y las funciones de ayuda
// para autenticación y guardado/lectura de datos en Firestore.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  arrayUnion,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =======================================================
// 1) PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE
//    (Firebase console > Configuración del proyecto > Tus apps > SDK config)
// =======================================================
const firebaseConfig = {
  apiKey: "AIzaSyBk0VfN4BATPOuMIB44zTOhSNya1q6uHd4",
  authDomain: "focus-app-2746d.firebaseapp.com",
  projectId: "focus-app-2746d",
  storageBucket: "focus-app-2746d.firebasestorage.app",
  messagingSenderId: "940097371366",
  appId: "1:940097371366:web:53efc673e5b563045b8f27"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// =======================================================
// Utilidad: redimensiona/comprime una imagen antes de guardarla.
// Firestore rechaza documentos de más de 1MB, así que cualquier
// foto tomada con el móvil (varios MB) hay que reducirla primero.
// =======================================================
export function resizeImageFile(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// =======================================================
// Autenticación
// =======================================================

// Espera a saber si hay usuario logueado.
// Si NO lo hay, redirige a login.html.
// Si lo hay, devuelve el objeto user.
export function requireAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        // Guardamos el email en su documento para poder encontrarlo al invitarlo a un chat
        try {
          await setDoc(doc(db, "users", user.uid), { email: (user.email || "").toLowerCase() }, { merge: true });
        } catch (err) {
          console.error("No se pudo guardar el email del usuario:", err);
        }
        resolve(user);
      } else {
        window.location.href = "login.html";
      }
    });
  });
}

export function logout() {
  return signOut(auth).then(() => {
    window.location.href = "login.html";
  });
}

// =======================================================
// Documento principal del usuario
// (guarda: profileInfo, timeSpent)
// =======================================================

export async function loadUserDoc(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : {};
}

export async function saveUserDoc(uid, partialData) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, partialData, { merge: true });
}

// =======================================================
// Subcolecciones: posts (Socialclub), photos (Memories), chats (Communities)
// Cada usuario tiene su propia subcolección privada:
//   users/{uid}/posts
//   users/{uid}/photos
//   users/{uid}/chats
// =======================================================

export async function addItem(uid, subcollection, data) {
  const colRef = collection(db, "users", uid, subcollection);
  const docRef = await addDoc(colRef, { ...data, createdAt: serverTimestamp() });
  return docRef.id;
}

// Guarda (o sobreescribe) un ítem usando una clave de fecha como ID del documento.
// Así solo puede existir un elemento por día (p.ej. una foto de Memories al día).
export async function setDatedItem(uid, subcollection, dateKey, data) {
  const ref = doc(db, "users", uid, subcollection, dateKey);
  await setDoc(ref, { ...data, dateKey, createdAt: serverTimestamp() }, { merge: true });
  return dateKey;
}

export async function getItems(uid, subcollection, max = 20) {
  const colRef = collection(db, "users", uid, subcollection);
  const q = query(colRef, orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteItem(uid, subcollection, itemId) {
  await deleteDoc(doc(db, "users", uid, subcollection, itemId));
}

// =======================================================
// Socialclub — feed GLOBAL y compartido entre usuarios
// (colección de nivel superior, no una subcolección privada)
//   posts/{postId}
//   posts/{postId}/likes/{uid}
//   posts/{postId}/reposts/{uid}
//   users/{uid}/saved/{postId}   -> guardados, son privados de cada usuario
// =======================================================

export async function createPost(uid, author, data) {
  const colRef = collection(db, "posts");
  const docRef = await addDoc(colRef, {
    authorId: uid,
    authorName: author.name,
    authorAvatar: author.avatar || null,
    text: data.text,
    image: data.image || null,
    book: data.book || null,
    likesCount: 0,
    repostsCount: 0,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function getFeedPosts(max = 30) {
  const colRef = collection(db, "posts");
  const q = query(colRef, orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Comprueba si el usuario actual ya dio like / repost / guardó un post concreto
export async function getUserInteractions(postId, uid) {
  const [likeSnap, repostSnap, savedSnap] = await Promise.all([
    getDoc(doc(db, "posts", postId, "likes", uid)),
    getDoc(doc(db, "posts", postId, "reposts", uid)),
    getDoc(doc(db, "users", uid, "saved", postId))
  ]);
  return {
    liked: likeSnap.exists(),
    reposted: repostSnap.exists(),
    saved: savedSnap.exists()
  };
}

export async function toggleLike(postId, uid, currentlyLiked) {
  const likeRef = doc(db, "posts", postId, "likes", uid);
  const postRef = doc(db, "posts", postId);
  if (currentlyLiked) {
    await deleteDoc(likeRef);
    await updateDoc(postRef, { likesCount: increment(-1) });
  } else {
    await setDoc(likeRef, { createdAt: serverTimestamp() });
    await updateDoc(postRef, { likesCount: increment(1) });
  }
}

export async function toggleRepost(postId, uid, currentlyReposted, postSnapshot) {
  const repostRef = doc(db, "posts", postId, "reposts", uid);
  const postRef = doc(db, "posts", postId);
  const mirrorRef = doc(db, "users", uid, "reposted", postId);
  if (currentlyReposted) {
    await deleteDoc(repostRef);
    await deleteDoc(mirrorRef);
    await updateDoc(postRef, { repostsCount: increment(-1) });
  } else {
    await setDoc(repostRef, { createdAt: serverTimestamp() });
    await setDoc(mirrorRef, { ...postSnapshot, createdAt: serverTimestamp() });
    await updateDoc(postRef, { repostsCount: increment(1) });
  }
}

export async function toggleSave(uid, postId, postData, currentlySaved) {
  const savedRef = doc(db, "users", uid, "saved", postId);
  if (currentlySaved) {
    await deleteDoc(savedRef);
  } else {
    await setDoc(savedRef, { ...postData, createdAt: serverTimestamp() });
  }
}

// Todos los posts publicados por un usuario concreto (para su perfil)
export async function getUserPosts(uid) {
  const colRef = collection(db, "posts");
  const q = query(colRef, where("authorId", "==", uid));
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  return docs;
}

// =======================================================
// Communities — chats REALES y compartidos entre usuarios
//   chats/{chatId}                  -> { name, members: [uid...], avatar, lastMessage, lastMessageAt }
//   chats/{chatId}/messages/{msgId} -> { senderId, senderName, senderAvatar, text, createdAt }
// =======================================================

export async function createChat(uid, name) {
  const colRef = collection(db, "chats");
  const docRef = await addDoc(colRef, {
    name,
    members: [uid],
    avatar: null,
    createdBy: uid,
    createdAt: serverTimestamp(),
    lastMessage: "",
    lastMessageAt: serverTimestamp()
  });
  return docRef.id;
}

// Escucha en tiempo real todos los chats de los que el usuario es miembro
export function listenToUserChats(uid, callback) {
  const colRef = collection(db, "chats");
  const q = query(colRef, where("members", "array-contains", uid));
  return onSnapshot(q, (snap) => {
    const chats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    chats.sort((a, b) => (b.lastMessageAt?.toMillis?.() || 0) - (a.lastMessageAt?.toMillis?.() || 0));
    callback(chats);
  });
}

// Busca a un usuario de FOCUS por su email (para invitarlo a un chat)
export async function findUserByEmail(email) {
  const colRef = collection(db, "users");
  const q = query(colRef, where("email", "==", email.trim().toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { uid: d.id, ...d.data() };
}

export async function inviteToChat(chatId, inviteeUid) {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, { members: arrayUnion(inviteeUid) });
}

export async function updateChatAvatar(chatId, avatarUrl) {
  await updateDoc(doc(db, "chats", chatId), { avatar: avatarUrl });
}

// Escucha en tiempo real los mensajes de un chat concreto
export function listenToMessages(chatId, callback) {
  const colRef = collection(db, "chats", chatId, "messages");
  const q = query(colRef, orderBy("createdAt", "asc"), limit(200));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function sendMessage(chatId, sender, text) {
  const colRef = collection(db, "chats", chatId, "messages");
  await addDoc(colRef, {
    senderId: sender.uid,
    senderName: sender.name,
    senderAvatar: sender.avatar || null,
    text,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: text,
    lastMessageAt: serverTimestamp()
  });
}
