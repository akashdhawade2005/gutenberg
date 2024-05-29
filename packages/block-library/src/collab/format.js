/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState, useMemo } from '@wordpress/element';
import {
	RichTextToolbarButton,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { comment as commentIcon } from '@wordpress/icons';
import { useSelect } from '@wordpress/data';
// eslint-disable-next-line import/no-extraneous-dependencies
import { addFilter } from '@wordpress/hooks';
import { useAnchor } from '@wordpress/rich-text';
import { useEffect } from '@wordpress/element';
import { store as coreStore } from '@wordpress/core-data';
import { addComment } from '@wordpress/collab';

/**
 * External dependencies
 */
import { v4 as uuid } from 'uuid';

/**
 * Internal dependencies
 */
//import Edit from './edit';
import BlockPopover from './block-popover';
const isBlockCommentExperimentEnabled =
	window?.__experimentalEnableBlockComment;

export const formatName = 'core/add-comment';
const title = __( 'Add comment' );

export const format = {
	title,
	tagName: 'div',
	className: null,
	attributes: {},
	edit: Edit,
};

function Edit( props ) {
	const  { isActive, contentRef } = props;
	const clientId  = useSelect( ( select ) => select( blockEditorStore ).getSelectedBlockClientId() );

	// State to manage the visibility of the comment modal.
	const [ isCommentModalVisible, setIsCommentModalVisible ] = useState( false );
	const [ threadId, setThreadId ] = useState( null );
	const [ currentThread, setCurrentThread ] = useState( [] );
	const [ allThreads, setAllThreads ] = useState( [] );
	
	addComment();
	
	// Function to toggle the comment modal visibility.
	const toggleCommentModal = () => {
		setIsCommentModalVisible( ( state ) => ! state );
	};

	// Set the threadId from the currently selected block classList if it exists.
	useEffect(() => {
		const threadId = contentRef.current?.classList?.value
			.split(' ')
			.find(className => className.startsWith('block-editor-collab__'));
		
		setThreadId( threadId?.slice('block-editor-collab__'.length || null ) );
	}, []);

	// Fetch blockComments from post meta using getEntityRecord.
	const { postId, getEntityRecord } = useSelect((select) => {
		console.log('IN useSelect fetching postID');
		const { getEntityRecord } = select(coreStore);
		return {
			postId: select('core/editor').getCurrentPostId(),
			getEntityRecord,
		}
	}, [] );

	useEffect( () => {
		const post   = getEntityRecord('postType', 'post', postId);
		console.log('post', post);
		const allThreads =  post?.meta?.collab ? JSON.parse( post.meta.collab ) : [];
		setAllThreads( allThreads );
	}, [ postId, threadId ] );
	console.log('allThreads',allThreads);

	useEffect(() => {
		const filteredComments = threadId ? allThreads[threadId]?.comments || [] : [];
		console.log('filteredComments',filteredComments);
		setCurrentThread( filteredComments );
	}, [ threadId ] );

	const currentUser = useSelect( ( select ) => {
		console.log( 'IN current user' );
		// eslint-disable-next-line @wordpress/data-no-store-string-literals
		const { getCurrentUser } = select( 'core' );
		return getCurrentUser()?.name;
	}, [] );

	console.log('isCommentModalVisible', isCommentModalVisible);


	return (
		<>
			<RichTextToolbarButton
				icon={ commentIcon }
				title={ title }
				onClick={ () => toggleCommentModal() }
				isActive={ isActive }
				role="menuitemcheckbox"
			/>
			{  isCommentModalVisible &&
				<BlockPopover 
			 		clientId={ clientId }
					contentRef={ contentRef }
					onClose={ toggleCommentModal }
					setThreadId={ setThreadId }
					threadId={ threadId }
					currentUser={ currentUser }
					allThreads={ allThreads }
					currentThread={ currentThread }
					postId={ postId }
					setCurrentThread={ setCurrentThread }
					setAllThreads={ setAllThreads}
				/>
			}
		</>
	);
}
