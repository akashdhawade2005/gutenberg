/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	Popover,
	TextControl,
	Button,
	CheckboxControl,
	__experimentalHStack as HStack,
	__experimentalVStack as VStack,
	Modal,
} from '@wordpress/components';
import { useAnchor } from '@wordpress/rich-text';
import { commentAuthorAvatar as userIcon, Icon, trash as deleteIcon } from '@wordpress/icons';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { useState, useEffect, useMemo } from '@wordpress/element';
// eslint-disable-next-line import/no-extraneous-dependencies
import { dateI18n, format, getSettings } from '@wordpress/date';

/**
 * External dependencies
 */
import { v4 as uuid } from 'uuid';
import { UP } from '@wordpress/keycodes';

const CommentBoard = ( {
	onClose,
	contentRef,
	clientId,
	threadId,
	setThreadId,
	currentUser,
	allThreads,
	currentThread,
	postId,
	setCurrentThread,
	setAllThreads,
} ) => {
	// Get the anchor for the popover.
	const popoverAnchor = useAnchor( { 
		editableContentElement: contentRef.current,
	} );

	// State to manage the comment input.
	const [ inputComment, setInputComment ] = useState( '' );
	const [ isResolved, setIsResolved] = useState(allThreads[threadId]?.isResolved || false);

	// State to manage the visibility of the confirmation overlay.
    const [showConfirmation, setShowConfirmation] = useState(false);

	const { saveEntityRecord } = useDispatch( coreStore );
	const { updateBlockAttributes } = useDispatch('core/block-editor');

	// Function to save the comment.
    const saveComment = async () => {
        const newComment = {
            commentId: uuid(),
            userName: currentUser,
            comment: inputComment,
            date: new Date().toISOString(),
        };
        console.log('NewComment', newComment);

        // Generate a unique key for the comment thread if it doesn't exist
        const threadKey = threadId || uuid();
		console.log('threadKey', threadKey);
        // Update the comments meta with the new structure

        const updatedComments = {
            ...allThreads,
            [threadKey]: {
                isResolved: isResolved,
                comments: [
					...(allThreads[threadKey]?.comments || []),
					newComment,
				],
            },
        };

        await saveEntityRecord('postType', 'post', {
            id: postId,
            meta: {
                collab: JSON.stringify( updatedComments ),
            },
        });
		console.log('threadIdsdsdssd', threadId);
        // If it's a new threadId, add it as a className to the block
        if ( ! threadId ) {
            updateBlockAttributes( clientId, {
                className: `block-editor-collab__${threadKey}`
            });
			
			setThreadId( threadKey );
        }

		
		setCurrentThread( updatedComments[threadKey]?.comments || [] );
		setAllThreads( updatedComments );
		setInputComment('');
    };

	// Function to mark thread as resolved
	const markThreadAsResolved = async (resolved) => {
        setIsResolved(resolved);

        let updatedComments = { ...allThreads };

        if (resolved) {
            delete updatedComments[threadId];

            updateBlockAttributes(clientId, {
                className: clientId.replace(`block-editor-collab__${threadId}`, '')
            });
        } else {
            updatedComments = {
                ...updatedComments,
                [threadId]: {
                    ...allThreads[threadId],
                    isResolved: resolved,
                },
            };
        }

        await saveEntityRecord('postType', 'post', {
            id: postId,
            meta: {
                collab: JSON.stringify(updatedComments),
            },
        });

		setThreadId( null );
        setAllThreads(updatedComments);
		onClose();
    };

	// Function to delete a comment
	const deleteComment = async ( commentId ) => {
		
		const currentComments = allThreads[threadId].comments.filter( ( comment ) => comment.commentId !== commentId );
		
		const updatedComments = {
			...allThreads,
			[threadId]: {
				...allThreads[threadId],
				comments: currentComments,
			},
		};

		await saveEntityRecord( 'postType', 'post', {
			id: postId,
			meta: {
				collab: JSON.stringify( updatedComments ),
			},
		} );

		if ( currentComments.length === 0 ) {	
			updateBlockAttributes(clientId, {
                className: clientId.replace(`block-editor-collab__${threadId}`, '')
            });
		}	

		setAllThreads( updatedComments );
		setCurrentThread( updatedComments[threadId]?.comments || [] );
	};


	// Function to show the confirmation overlay.
    const showConfirmationOverlay = () => {
        setShowConfirmation(true);
    };

    // Function to hide the confirmation overlay.
    const hideConfirmationOverlay = () => {
        setShowConfirmation(false);
    };

    // Function to confirm and mark thread as resolved.
    const confirmAndMarkThreadAsResolved = () => {
        markThreadAsResolved(true);
        hideConfirmationOverlay();
    };

	// Get the date time format from WordPress settings.
	const dateTimeFormat = getSettings().formats.datetime;
	console.log('currentThread', currentThread);

	return (
		<>
		<Popover
			className="block-editor-format-toolbar__comment-board"
			anchor={ popoverAnchor }
		>
			<VStack spacing="3">
			{ currentThread.length &&
				<div className='block-editor-format-toolbar__comment-board__resolved' title={__('Mark as resolved')}>
					<CheckboxControl
						checked={isResolved}
						onChange={ showConfirmationOverlay }
					/>
				</div>
			}	
				{ currentThread.length &&
					currentThread.map( ( { userName, comment, timestamp, commentId } ) => (
						<VStack
							spacing="2"
							key={ timestamp }
							className="comment-board__comment"
						>
							<HStack alignment="left" spacing="1" justify="space-between">
								<Icon icon={ userIcon } size={ 35 } />
								<VStack spacing="1">
									<span>{ userName }</span>
									<time dateTime={ format( 'c', timestamp ) }>
										{ dateI18n(
											dateTimeFormat,
											timestamp
										) }
									</time>
								</VStack>
								<Button
									icon={ deleteIcon }
									label={ __( 'Delete comment', 'my-plugin' ) }
									onClick={ () => deleteComment( commentId ) }
								/>
							</HStack>
							<p>{ comment }</p>
						</VStack>
					) ) }
				<VStack spacing="2">
					{ currentThread.length === 0 && (
						<HStack alignment="left" spacing="1">
							<Icon icon={ userIcon } size={ 35 } />
							<span>{ currentUser }</span>
						</HStack>
					) }
					<TextControl
						value={ inputComment }
						onChange={ ( val ) => setInputComment( val ) }
						placeholder={ __( 'Comment or add others with @' ) }
					/>
					<HStack alignment="right" spacing="1">
						<Button
							className="block-editor-format-toolbar__cancel-button"
							variant="secondary"
							text={ __( 'Cancel' ) }
							onClick={ () => onClose() }
						/>
						<Button
							className="block-editor-format-toolbar__comment-button"
							variant="primary"
							text={
								currentThread.length === 0
									? __( 'Comment' )
									: __( 'Reply' )
							}
							disabled={ inputComment.length === 0 }
							onClick={ () => saveComment() }
						/>
					</HStack>
				</VStack>
			</VStack>
		</Popover>
		{showConfirmation && (
			<Modal
				title={__('Confirm')}
				onRequestClose={hideConfirmationOverlay}
				shouldCloseOnClickOutside={true}
				shouldCloseOnEsc={true}
				className="confirmation-overlay"
			>
				<p>
					{__(
						'Are you sure you want to mark this thread as resolved?'
					)}
				</p>
				<Button isDefault onClick={confirmAndMarkThreadAsResolved}>
					{__('Yes')}
				</Button>
				<Button onClick={hideConfirmationOverlay}>
					{__('No')}
				</Button>
			</Modal>
		)}
		</>
	);
};

export default CommentBoard;